-- =========================================
-- CONFIGURATION COMPLÈTE DU SYSTÈME DE VIDÉOCONFÉRENCE
-- Script complet à exécuter dans Supabase SQL Editor
-- Crée toutes les tables nécessaires avec toutes les colonnes
-- =========================================

-- =========================================
-- 1. CRÉATION DE LA TABLE VIDEO_MEETINGS
-- =========================================

CREATE TABLE IF NOT EXISTS video_meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    room_id TEXT NOT NULL UNIQUE,
    description TEXT,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
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

-- =========================================
-- 2. CRÉATION DE LA TABLE VIDEO_MEETING_PARTICIPANTS
-- =========================================

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
-- 3. CRÉATION DE LA TABLE VIDEO_MEETING_REQUESTS
-- =========================================

CREATE TABLE IF NOT EXISTS video_meeting_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
    requested_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    responded_at TIMESTAMP WITH TIME ZONE,
    responded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    response_message TEXT,
    created_meeting_id UUID REFERENCES video_meetings(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =========================================
-- 4. CRÉATION DE LA TABLE VIDEO_MEETING_REQUEST_PARTICIPANTS
-- =========================================

CREATE TABLE IF NOT EXISTS video_meeting_request_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES video_meeting_requests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(request_id, user_id)
);

-- =========================================
-- 5. CRÉATION DE LA TABLE MEETING_RECORDINGS
-- =========================================

CREATE TABLE IF NOT EXISTS meeting_recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES video_meetings(id) ON DELETE CASCADE,
    meeting_room_id TEXT NOT NULL,
    recorded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'recording' CHECK (status IN ('recording', 'completed', 'failed')),
    file_path TEXT,
    file_url TEXT,
    thumbnail_url TEXT,
    duration_seconds INTEGER DEFAULT 0,
    file_size_bytes BIGINT DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =========================================
-- 6. AJOUT DES COLONNES MANQUANTES (SI NÉCESSAIRE)
-- =========================================

-- Ajouter les colonnes manquantes à video_meetings
DO $$ 
BEGIN
    -- created_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'video_meetings' AND column_name = 'created_at') THEN
        ALTER TABLE video_meetings ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- updated_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'video_meetings' AND column_name = 'updated_at') THEN
        ALTER TABLE video_meetings ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- ended_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'video_meetings' AND column_name = 'ended_at') THEN
        ALTER TABLE video_meetings ADD COLUMN ended_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- recording_available
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'video_meetings' AND column_name = 'recording_available') THEN
        ALTER TABLE video_meetings ADD COLUMN recording_available BOOLEAN DEFAULT false;
    END IF;
    
    -- project_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'video_meetings' AND column_name = 'project_id') THEN
        ALTER TABLE video_meetings ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
    END IF;
    
    -- deleted_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'video_meetings' AND column_name = 'deleted_at') THEN
        ALTER TABLE video_meetings ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Ajouter les colonnes manquantes à video_meeting_participants
DO $$ 
BEGIN
    -- meeting_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'video_meeting_participants' AND column_name = 'meeting_id') THEN
        ALTER TABLE video_meeting_participants ADD COLUMN meeting_id UUID NOT NULL REFERENCES video_meetings(id) ON DELETE CASCADE;
    END IF;
    
    -- user_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'video_meeting_participants' AND column_name = 'user_id') THEN
        ALTER TABLE video_meeting_participants ADD COLUMN user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
    
    -- left_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'video_meeting_participants' AND column_name = 'left_at') THEN
        ALTER TABLE video_meeting_participants ADD COLUMN left_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- created_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'video_meeting_participants' AND column_name = 'created_at') THEN
        ALTER TABLE video_meeting_participants ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Ajouter les colonnes manquantes à video_meeting_requests
DO $$ 
BEGIN
    -- created_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'video_meeting_requests' AND column_name = 'created_at') THEN
        ALTER TABLE video_meeting_requests ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- updated_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'video_meeting_requests' AND column_name = 'updated_at') THEN
        ALTER TABLE video_meeting_requests ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- project_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'video_meeting_requests' AND column_name = 'project_id') THEN
        ALTER TABLE video_meeting_requests ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
    END IF;
END $$;

-- =========================================
-- 7. CRÉATION DES INDEX POUR OPTIMISER LES PERFORMANCES
-- =========================================

-- Index pour video_meetings
CREATE INDEX IF NOT EXISTS idx_video_meetings_created_by ON video_meetings(created_by);
CREATE INDEX IF NOT EXISTS idx_video_meetings_status ON video_meetings(status);
CREATE INDEX IF NOT EXISTS idx_video_meetings_scheduled_time ON video_meetings(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_video_meetings_room_id ON video_meetings(room_id);
CREATE INDEX IF NOT EXISTS idx_video_meetings_project_id ON video_meetings(project_id);
CREATE INDEX IF NOT EXISTS idx_video_meetings_deleted_at ON video_meetings(deleted_at);
CREATE INDEX IF NOT EXISTS idx_video_meetings_created_at ON video_meetings(created_at);

-- Index pour video_meeting_participants
CREATE INDEX IF NOT EXISTS idx_video_meeting_participants_meeting_id ON video_meeting_participants(meeting_id);
CREATE INDEX IF NOT EXISTS idx_video_meeting_participants_user_id ON video_meeting_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_video_meeting_participants_role ON video_meeting_participants(role);
CREATE INDEX IF NOT EXISTS idx_video_meeting_participants_created_at ON video_meeting_participants(created_at);

-- Index pour video_meeting_requests
CREATE INDEX IF NOT EXISTS idx_video_meeting_requests_requested_by ON video_meeting_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_video_meeting_requests_status ON video_meeting_requests(status);
CREATE INDEX IF NOT EXISTS idx_video_meeting_requests_scheduled_time ON video_meeting_requests(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_video_meeting_requests_project_id ON video_meeting_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_video_meeting_requests_created_at ON video_meeting_requests(created_at);

-- Index pour video_meeting_request_participants
CREATE INDEX IF NOT EXISTS idx_video_meeting_request_participants_request_id ON video_meeting_request_participants(request_id);
CREATE INDEX IF NOT EXISTS idx_video_meeting_request_participants_user_id ON video_meeting_request_participants(user_id);

-- Index pour meeting_recordings
CREATE INDEX IF NOT EXISTS idx_meeting_recordings_meeting_id ON meeting_recordings(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_recordings_recorded_by ON meeting_recordings(recorded_by);
CREATE INDEX IF NOT EXISTS idx_meeting_recordings_status ON meeting_recordings(status);
CREATE INDEX IF NOT EXISTS idx_meeting_recordings_created_at ON meeting_recordings(created_at);

-- =========================================
-- 8. ACTIVATION DES POLITIQUES RLS
-- =========================================

-- Activer RLS pour toutes les tables
ALTER TABLE video_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_meeting_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_meeting_request_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_recordings ENABLE ROW LEVEL SECURITY;

-- =========================================
-- 9. CRÉATION DES POLITIQUES RLS
-- =========================================

-- Politiques pour video_meetings
DROP POLICY IF EXISTS "Users can view accessible meetings" ON video_meetings;
CREATE POLICY "Users can view accessible meetings" ON video_meetings
    FOR SELECT USING (
        deleted_at IS NULL AND (
            created_by = auth.uid() OR
            id IN (SELECT meeting_id FROM video_meeting_participants WHERE user_id = auth.uid()) OR
            EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
        )
    );

DROP POLICY IF EXISTS "Users can create meetings" ON video_meetings;
CREATE POLICY "Users can create meetings" ON video_meetings
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

DROP POLICY IF EXISTS "Users can update their meetings" ON video_meetings;
CREATE POLICY "Users can update their meetings" ON video_meetings
    FOR UPDATE USING (
        created_by = auth.uid() OR
        EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
    );

-- Politiques pour video_meeting_participants
DROP POLICY IF EXISTS "Users can view meeting participants" ON video_meeting_participants;
CREATE POLICY "Users can view meeting participants" ON video_meeting_participants
    FOR SELECT USING (
        user_id = auth.uid() OR
        meeting_id IN (SELECT id FROM video_meetings WHERE created_by = auth.uid()) OR
        EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "Users can manage meeting participants" ON video_meeting_participants;
CREATE POLICY "Users can manage meeting participants" ON video_meeting_participants
    FOR ALL USING (
        meeting_id IN (SELECT id FROM video_meetings WHERE created_by = auth.uid()) OR
        EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
    );

-- Politiques pour video_meeting_requests
DROP POLICY IF EXISTS "Users can view meeting requests" ON video_meeting_requests;
CREATE POLICY "Users can view meeting requests" ON video_meeting_requests
    FOR SELECT USING (
        requested_by = auth.uid() OR
        EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "Users can create meeting requests" ON video_meeting_requests;
CREATE POLICY "Users can create meeting requests" ON video_meeting_requests
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND requested_by = auth.uid());

DROP POLICY IF EXISTS "Admins can update meeting requests" ON video_meeting_requests;
CREATE POLICY "Admins can update meeting requests" ON video_meeting_requests
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
    );

-- Politiques pour meeting_recordings
DROP POLICY IF EXISTS "Users can view recordings" ON meeting_recordings;
CREATE POLICY "Users can view recordings" ON meeting_recordings
    FOR SELECT USING (
        recorded_by = auth.uid() OR
        meeting_id IN (SELECT meeting_id FROM video_meeting_participants WHERE user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
    );

-- =========================================
-- 10. CRÉATION DES TRIGGERS
-- =========================================

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour video_meetings
DROP TRIGGER IF EXISTS trigger_update_video_meetings_updated_at ON video_meetings;
CREATE TRIGGER trigger_update_video_meetings_updated_at
    BEFORE UPDATE ON video_meetings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Triggers pour video_meeting_requests
DROP TRIGGER IF EXISTS trigger_update_video_meeting_requests_updated_at ON video_meeting_requests;
CREATE TRIGGER trigger_update_video_meeting_requests_updated_at
    BEFORE UPDATE ON video_meeting_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Triggers pour meeting_recordings
DROP TRIGGER IF EXISTS trigger_update_meeting_recordings_updated_at ON meeting_recordings;
CREATE TRIGGER trigger_update_meeting_recordings_updated_at
    BEFORE UPDATE ON meeting_recordings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =========================================
-- 11. CRÉATION DES VUES
-- =========================================

-- Vue meeting_details
DROP VIEW IF EXISTS meeting_details;
CREATE OR REPLACE VIEW meeting_details AS
SELECT 
    m.id,
    m.title,
    m.room_id,
    m.description,
    m.project_id,
    p.name as project_name,
    m.scheduled_time,
    m.is_instant,
    m.status,
    m.created_by,
    m.created_at,
    m.updated_at,
    m.ended_at,
    COALESCE(m.recording_available, false) as recording_available,
    COUNT(DISTINCT mp.id) as participant_count,
    COUNT(DISTINCT mr.id) as recording_count
FROM video_meetings m
LEFT JOIN projects p ON m.project_id = p.id
LEFT JOIN video_meeting_participants mp ON m.id = mp.meeting_id
LEFT JOIN meeting_recordings mr ON m.id = mr.meeting_id AND mr.status = 'completed'
WHERE COALESCE(m.deleted_at, '1900-01-01'::timestamp) = '1900-01-01'::timestamp
GROUP BY m.id, m.title, m.room_id, m.description, m.project_id, p.name, 
         m.scheduled_time, m.is_instant, m.status, m.created_by, m.created_at, 
         m.updated_at, m.ended_at, m.recording_available;

-- Vue meeting_request_details
DROP VIEW IF EXISTS meeting_request_details;
CREATE OR REPLACE VIEW meeting_request_details AS
SELECT 
    mr.id,
    mr.title,
    mr.description,
    mr.project_id,
    p.name as project_name,
    mr.requested_by,
    prof.first_name || ' ' || prof.last_name as requested_by_name,
    mr.status,
    mr.scheduled_time,
    mr.requested_time,
    mr.responded_at,
    mr.responded_by,
    mr.response_message,
    mr.created_meeting_id,
    mr.created_at,
    mr.updated_at,
    COUNT(mrp.id) as suggested_participants_count
FROM video_meeting_requests mr
LEFT JOIN projects p ON mr.project_id = p.id
LEFT JOIN profiles prof ON mr.requested_by = prof.user_id
LEFT JOIN video_meeting_request_participants mrp ON mr.id = mrp.request_id
GROUP BY mr.id, p.name, prof.first_name, prof.last_name;

-- =========================================
-- 12. CRÉATION DES FONCTIONS RPC
-- =========================================

-- Fonction pour ajouter un participant
CREATE OR REPLACE FUNCTION add_meeting_participant(
    p_meeting_id UUID,
    p_user_id UUID,
    p_role TEXT DEFAULT 'participant',
    p_status TEXT DEFAULT 'invited'
)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO video_meeting_participants (meeting_id, user_id, role, status)
    VALUES (p_meeting_id, p_user_id, p_role, p_status)
    ON CONFLICT (meeting_id, user_id) 
    DO UPDATE SET role = EXCLUDED.role, status = EXCLUDED.status;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================
-- 13. PERMISSIONS
-- =========================================

-- Accorder les permissions appropriées
GRANT SELECT, INSERT, UPDATE ON video_meetings TO authenticated;
GRANT SELECT, INSERT, DELETE ON video_meeting_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE ON video_meeting_requests TO authenticated;
GRANT SELECT, INSERT, DELETE ON video_meeting_request_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE ON meeting_recordings TO authenticated;
GRANT SELECT ON meeting_details TO authenticated;
GRANT SELECT ON meeting_request_details TO authenticated;
GRANT EXECUTE ON FUNCTION add_meeting_participant(UUID, UUID, TEXT, TEXT) TO authenticated;

-- =========================================
-- 14. MISE À JOUR DES DONNÉES EXISTANTES
-- =========================================

-- Mettre à jour les enregistrements sans created_at
UPDATE video_meetings SET created_at = NOW() WHERE created_at IS NULL;
UPDATE video_meeting_participants SET created_at = NOW() WHERE created_at IS NULL;
UPDATE video_meeting_requests SET created_at = NOW() WHERE created_at IS NULL;
UPDATE meeting_recordings SET created_at = NOW() WHERE created_at IS NULL;

-- =========================================
-- SCRIPT TERMINÉ AVEC SUCCÈS
-- =========================================

-- Ce script a créé et configuré :
-- ✅ Toutes les tables nécessaires avec toutes les colonnes
-- ✅ Tous les index pour optimiser les performances
-- ✅ Toutes les politiques RLS pour la sécurité
-- ✅ Tous les triggers pour maintenance automatique
-- ✅ Toutes les vues pour faciliter les requêtes
-- ✅ Toutes les fonctions RPC nécessaires
-- ✅ Toutes les permissions appropriées
-- ✅ Mise à jour des données existantes

SELECT 'CONFIGURATION COMPLÈTE TERMINÉE AVEC SUCCÈS' as status; 