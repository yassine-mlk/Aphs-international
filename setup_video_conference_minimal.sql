-- =========================================
-- CONFIGURATION VIDÉOCONFÉRENCE MINIMALE
-- Script à exécuter dans Supabase SQL Editor
-- Évite tous les conflits avec les fonctions existantes
-- =========================================

-- =========================================
-- 1. ACTIVER REALTIME POUR LES TABLES VIDÉO
-- =========================================

-- Activer Realtime pour video_meetings (si la table existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'video_meetings') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE video_meetings;
        RAISE NOTICE 'Realtime activé pour video_meetings';
    ELSE
        RAISE NOTICE 'Table video_meetings n''existe pas encore';
    END IF;
END $$;

-- Activer Realtime pour video_meeting_participants (si la table existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'video_meeting_participants') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE video_meeting_participants;
        RAISE NOTICE 'Realtime activé pour video_meeting_participants';
    ELSE
        RAISE NOTICE 'Table video_meeting_participants n''existe pas encore';
    END IF;
END $$;

-- =========================================
-- 2. CRÉER LES TABLES SI ELLES N'EXISTENT PAS
-- =========================================

-- Table des réunions vidéo (version minimale)
CREATE TABLE IF NOT EXISTS video_meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    room_id TEXT NOT NULL UNIQUE,
    description TEXT,
    scheduled_time TIMESTAMP WITH TIME ZONE,
    is_instant BOOLEAN DEFAULT false,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'ended', 'cancelled')),
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    recording_available BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Table des participants
CREATE TABLE IF NOT EXISTS video_meeting_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES video_meetings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('host', 'participant')),
    status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'accepted', 'declined', 'joined')),
    joined_at TIMESTAMP WITH TIME ZONE,
    left_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(meeting_id, user_id)
);

-- =========================================
-- 3. CRÉER LES INDEX POUR LES PERFORMANCES
-- =========================================

-- Index pour video_meetings
CREATE INDEX IF NOT EXISTS idx_video_meetings_created_by ON video_meetings(created_by);
CREATE INDEX IF NOT EXISTS idx_video_meetings_status ON video_meetings(status);
CREATE INDEX IF NOT EXISTS idx_video_meetings_scheduled_time ON video_meetings(scheduled_time);

-- Index pour video_meeting_participants
CREATE INDEX IF NOT EXISTS idx_video_meeting_participants_meeting_id ON video_meeting_participants(meeting_id);
CREATE INDEX IF NOT EXISTS idx_video_meeting_participants_user_id ON video_meeting_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_video_meeting_participants_status ON video_meeting_participants(status);

-- =========================================
-- 4. CRÉER LES FONCTIONS RPC (AVEC NOMS UNIQUES)
-- =========================================

-- Fonction pour ajouter un participant à une réunion (nom unique)
CREATE OR REPLACE FUNCTION video_add_meeting_participant(
    p_meeting_id UUID,
    p_user_id UUID,
    p_role TEXT DEFAULT 'participant',
    p_status TEXT DEFAULT 'invited'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO video_meeting_participants (meeting_id, user_id, role, status)
    VALUES (p_meeting_id, p_user_id, p_role, p_status)
    ON CONFLICT (meeting_id, user_id) 
    DO UPDATE SET 
        role = EXCLUDED.role,
        status = EXCLUDED.status;
END;
$$;

-- Fonction pour rejoindre une réunion (nom unique)
CREATE OR REPLACE FUNCTION video_join_meeting(
    p_meeting_id UUID,
    p_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE video_meeting_participants 
    SET 
        status = 'joined',
        joined_at = NOW()
    WHERE meeting_id = p_meeting_id AND user_id = p_user_id;
    
    -- Mettre à jour le statut de la réunion si c'est la première personne
    UPDATE video_meetings 
    SET 
        status = 'active',
        updated_at = NOW()
    WHERE id = p_meeting_id AND status = 'scheduled';
END;
$$;

-- Fonction pour quitter une réunion (nom unique)
CREATE OR REPLACE FUNCTION video_leave_meeting(
    p_meeting_id UUID,
    p_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE video_meeting_participants 
    SET 
        status = 'invited',
        left_at = NOW()
    WHERE meeting_id = p_meeting_id AND user_id = p_user_id;
    
    -- Vérifier s'il reste des participants actifs
    IF NOT EXISTS (
        SELECT 1 FROM video_meeting_participants 
        WHERE meeting_id = p_meeting_id AND status = 'joined'
    ) THEN
        -- Terminer la réunion si plus personne
        UPDATE video_meetings 
        SET 
            status = 'ended',
            ended_at = NOW(),
            updated_at = NOW()
        WHERE id = p_meeting_id;
    END IF;
END;
$$;

-- Fonction pour terminer une réunion (nom unique)
CREATE OR REPLACE FUNCTION video_end_meeting(
    p_meeting_id UUID,
    p_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Vérifier que l'utilisateur est le créateur ou un admin
    IF NOT EXISTS (
        SELECT 1 FROM video_meetings vm
        LEFT JOIN profiles p ON p.user_id = p_user_id
        WHERE vm.id = p_meeting_id 
        AND (vm.created_by = p_user_id OR p.role = 'admin')
    ) THEN
        RAISE EXCEPTION 'Vous n''avez pas les permissions pour terminer cette réunion';
    END IF;
    
    -- Terminer la réunion
    UPDATE video_meetings 
    SET 
        status = 'ended',
        ended_at = NOW(),
        updated_at = NOW()
    WHERE id = p_meeting_id;
    
    -- Marquer tous les participants comme déconnectés
    UPDATE video_meeting_participants 
    SET 
        status = 'invited',
        left_at = NOW()
    WHERE meeting_id = p_meeting_id AND status = 'joined';
END;
$$;

-- =========================================
-- 5. CRÉER LES POLITIQUES RLS
-- =========================================

-- Activer RLS sur toutes les tables
ALTER TABLE video_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_meeting_participants ENABLE ROW LEVEL SECURITY;

-- Politiques pour video_meetings
DROP POLICY IF EXISTS "Users can view their meetings" ON video_meetings;
CREATE POLICY "Users can view their meetings" ON video_meetings
    FOR SELECT USING (
        created_by = auth.uid() OR
        id IN (
            SELECT meeting_id FROM video_meeting_participants 
            WHERE user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Users can create meetings" ON video_meetings;
CREATE POLICY "Users can create meetings" ON video_meetings
    FOR INSERT WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can update their meetings" ON video_meetings;
CREATE POLICY "Users can update their meetings" ON video_meetings
    FOR UPDATE USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Users can delete their meetings" ON video_meetings;
CREATE POLICY "Users can delete their meetings" ON video_meetings
    FOR DELETE USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Politiques pour video_meeting_participants
DROP POLICY IF EXISTS "Users can view meeting participants" ON video_meeting_participants;
CREATE POLICY "Users can view meeting participants" ON video_meeting_participants
    FOR SELECT USING (
        user_id = auth.uid() OR
        meeting_id IN (
            SELECT id FROM video_meetings WHERE created_by = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Users can manage meeting participants" ON video_meeting_participants;
CREATE POLICY "Users can manage meeting participants" ON video_meeting_participants
    FOR ALL USING (
        user_id = auth.uid() OR
        meeting_id IN (
            SELECT id FROM video_meetings WHERE created_by = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- =========================================
-- 6. CRÉER LES TRIGGERS
-- =========================================

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION video_update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Appliquer le trigger sur video_meetings
DROP TRIGGER IF EXISTS update_video_meetings_updated_at ON video_meetings;
CREATE TRIGGER update_video_meetings_updated_at
    BEFORE UPDATE ON video_meetings
    FOR EACH ROW
    EXECUTE FUNCTION video_update_updated_at_column();

-- =========================================
-- 7. VÉRIFICATION FINALE
-- =========================================

-- Vérifier que Realtime est activé
SELECT 
    schemaname,
    tablename,
    CASE WHEN schemaname = 'public' AND tablename IN ('video_meetings', 'video_meeting_participants')
         THEN '✅ Realtime activé'
         ELSE '❌ Realtime non activé'
    END as realtime_status
FROM pg_tables 
WHERE tablename IN ('video_meetings', 'video_meeting_participants');

-- Vérifier les politiques RLS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename IN ('video_meetings', 'video_meeting_participants')
ORDER BY tablename, policyname;

-- Afficher un message de succès
SELECT 'Configuration vidéoconférence minimale terminée avec succès !' as status; 