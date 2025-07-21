-- =========================================
-- CORRECTION AGGRESSIVE DES POLITIQUES RLS VIDÉOCONFÉRENCE
-- Script à exécuter dans Supabase SQL Editor
-- Supprime complètement toutes les politiques problématiques
-- =========================================

-- =========================================
-- 1. DÉSACTIVER RLS TEMPORAIREMENT
-- =========================================

-- Désactiver RLS sur les tables pour éviter les erreurs
ALTER TABLE video_meetings DISABLE ROW LEVEL SECURITY;
ALTER TABLE video_meeting_participants DISABLE ROW LEVEL SECURITY;

-- =========================================
-- 2. SUPPRIMER TOUTES LES POLITIQUES EXISTANTES
-- =========================================

-- Supprimer toutes les politiques de video_meetings
DROP POLICY IF EXISTS "Users can view their meetings" ON video_meetings;
DROP POLICY IF EXISTS "Users can create meetings" ON video_meetings;
DROP POLICY IF EXISTS "Users can update their meetings" ON video_meetings;
DROP POLICY IF EXISTS "Users can delete their meetings" ON video_meetings;
DROP POLICY IF EXISTS "video_meetings_select_policy" ON video_meetings;
DROP POLICY IF EXISTS "video_meetings_insert_policy" ON video_meetings;
DROP POLICY IF EXISTS "video_meetings_update_policy" ON video_meetings;
DROP POLICY IF EXISTS "video_meetings_delete_policy" ON video_meetings;

-- Supprimer toutes les politiques de video_meeting_participants
DROP POLICY IF EXISTS "Users can view meeting participants" ON video_meeting_participants;
DROP POLICY IF EXISTS "Users can manage meeting participants" ON video_meeting_participants;
DROP POLICY IF EXISTS "video_meeting_participants_select_policy" ON video_meeting_participants;
DROP POLICY IF EXISTS "video_meeting_participants_insert_policy" ON video_meeting_participants;
DROP POLICY IF EXISTS "video_meeting_participants_update_policy" ON video_meeting_participants;
DROP POLICY IF EXISTS "video_meeting_participants_delete_policy" ON video_meeting_participants;

-- =========================================
-- 3. RÉACTIVER RLS ET CRÉER DES POLITIQUES SIMPLES
-- =========================================

-- Réactiver RLS
ALTER TABLE video_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_meeting_participants ENABLE ROW LEVEL SECURITY;

-- Politiques très simples pour video_meetings
CREATE POLICY "vm_select" ON video_meetings
    FOR SELECT USING (true);

CREATE POLICY "vm_insert" ON video_meetings
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "vm_update" ON video_meetings
    FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "vm_delete" ON video_meetings
    FOR DELETE USING (created_by = auth.uid());

-- Politiques très simples pour video_meeting_participants
CREATE POLICY "vmp_select" ON video_meeting_participants
    FOR SELECT USING (true);

CREATE POLICY "vmp_insert" ON video_meeting_participants
    FOR INSERT WITH CHECK (true);

CREATE POLICY "vmp_update" ON video_meeting_participants
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "vmp_delete" ON video_meeting_participants
    FOR DELETE USING (user_id = auth.uid());

-- =========================================
-- 4. CRÉER DES FONCTIONS SÉCURISÉES POUR L'ACCÈS
-- =========================================

-- Fonction pour récupérer les réunions de l'utilisateur
CREATE OR REPLACE FUNCTION get_user_video_meetings()
RETURNS TABLE (
    id UUID,
    title TEXT,
    room_id TEXT,
    description TEXT,
    scheduled_time TIMESTAMP WITH TIME ZONE,
    is_instant BOOLEAN,
    status TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    recording_available BOOLEAN,
    deleted_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT vm.*
    FROM video_meetings vm
    WHERE 
        vm.created_by = auth.uid() OR
        vm.id IN (
            SELECT meeting_id 
            FROM video_meeting_participants 
            WHERE user_id = auth.uid()
        )
    ORDER BY vm.created_at DESC;
END;
$$;

-- Fonction pour récupérer toutes les réunions (admin seulement)
CREATE OR REPLACE FUNCTION get_all_video_meetings()
RETURNS TABLE (
    id UUID,
    title TEXT,
    room_id TEXT,
    description TEXT,
    scheduled_time TIMESTAMP WITH TIME ZONE,
    is_instant BOOLEAN,
    status TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    recording_available BOOLEAN,
    deleted_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Vérifier que l'utilisateur est admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Accès non autorisé';
    END IF;

    RETURN QUERY
    SELECT vm.*
    FROM video_meetings vm
    WHERE vm.deleted_at IS NULL
    ORDER BY vm.created_at DESC;
END;
$$;

-- Fonction pour récupérer les participants d'une réunion
CREATE OR REPLACE FUNCTION get_video_meeting_participants(p_meeting_id UUID)
RETURNS TABLE (
    id UUID,
    meeting_id UUID,
    user_id UUID,
    role TEXT,
    status TEXT,
    joined_at TIMESTAMP WITH TIME ZONE,
    left_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT vmp.*
    FROM video_meeting_participants vmp
    WHERE vmp.meeting_id = p_meeting_id
    ORDER BY vmp.created_at;
END;
$$;

-- =========================================
-- 5. CRÉER DES FONCTIONS POUR LA GESTION DES RÉUNIONS
-- =========================================

-- Fonction pour créer une réunion
CREATE OR REPLACE FUNCTION create_video_meeting(
    p_title TEXT,
    p_room_id TEXT,
    p_description TEXT DEFAULT NULL,
    p_scheduled_time TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_is_instant BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_meeting_id UUID;
BEGIN
    INSERT INTO video_meetings (
        title, 
        room_id, 
        description, 
        scheduled_time, 
        is_instant, 
        created_by
    ) VALUES (
        p_title, 
        p_room_id, 
        p_description, 
        p_scheduled_time, 
        p_is_instant, 
        auth.uid()
    ) RETURNING id INTO v_meeting_id;
    
    RETURN v_meeting_id;
END;
$$;

-- Fonction pour ajouter un participant
CREATE OR REPLACE FUNCTION add_video_meeting_participant(
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
    INSERT INTO video_meeting_participants (
        meeting_id, 
        user_id, 
        role, 
        status
    ) VALUES (
        p_meeting_id, 
        p_user_id, 
        p_role, 
        p_status
    ) ON CONFLICT (meeting_id, user_id) 
    DO UPDATE SET 
        role = EXCLUDED.role,
        status = EXCLUDED.status;
END;
$$;

-- Fonction pour rejoindre une réunion
CREATE OR REPLACE FUNCTION join_video_meeting(
    p_meeting_id UUID
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
    WHERE meeting_id = p_meeting_id AND user_id = auth.uid();
    
    -- Mettre à jour le statut de la réunion si c'est la première personne
    UPDATE video_meetings 
    SET 
        status = 'active',
        updated_at = NOW()
    WHERE id = p_meeting_id AND status = 'scheduled';
END;
$$;

-- Fonction pour quitter une réunion
CREATE OR REPLACE FUNCTION leave_video_meeting(
    p_meeting_id UUID
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
    WHERE meeting_id = p_meeting_id AND user_id = auth.uid();
    
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

-- Fonction pour terminer une réunion
CREATE OR REPLACE FUNCTION end_video_meeting(
    p_meeting_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Vérifier que l'utilisateur est le créateur ou un admin
    IF NOT EXISTS (
        SELECT 1 FROM video_meetings vm
        LEFT JOIN profiles p ON p.user_id = auth.uid()
        WHERE vm.id = p_meeting_id 
        AND (vm.created_by = auth.uid() OR p.role = 'admin')
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
-- 6. VÉRIFICATION FINALE
-- =========================================

-- Vérifier que les politiques sont créées
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

-- Vérifier que les fonctions sont créées
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_name LIKE '%video%' AND routine_name LIKE '%meeting%'
ORDER BY routine_name;

-- Afficher un message de succès
SELECT 'Correction aggressive terminée avec succès !' as status; 