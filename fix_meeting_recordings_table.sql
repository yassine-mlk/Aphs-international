-- =========================================
-- SCRIPT DE CORRECTION POUR LA TABLE MEETING_RECORDINGS MANQUANTE
-- À exécuter dans Supabase SQL Editor après fix_created_at_column_issue.sql
-- =========================================

-- =========================================
-- 1. CRÉATION DE LA TABLE MEETING_RECORDINGS
-- =========================================

CREATE TABLE IF NOT EXISTS meeting_recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES video_meetings(id) ON DELETE CASCADE,
    meeting_room_id TEXT NOT NULL,
    recorded_by UUID NOT NULL REFERENCES auth.users(id),
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
-- 2. CRÉATION DES INDEX POUR MEETING_RECORDINGS
-- =========================================

CREATE INDEX IF NOT EXISTS idx_meeting_recordings_meeting_id ON meeting_recordings(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_recordings_recorded_by ON meeting_recordings(recorded_by);
CREATE INDEX IF NOT EXISTS idx_meeting_recordings_status ON meeting_recordings(status);
CREATE INDEX IF NOT EXISTS idx_meeting_recordings_created_at ON meeting_recordings(created_at);

-- =========================================
-- 3. POLITIQUES RLS POUR MEETING_RECORDINGS
-- =========================================

-- Activer RLS
ALTER TABLE meeting_recordings ENABLE ROW LEVEL SECURITY;

-- Politique pour que les utilisateurs puissent voir leurs propres enregistrements
DROP POLICY IF EXISTS "Users can view their own recordings" ON meeting_recordings;
CREATE POLICY "Users can view their own recordings" ON meeting_recordings
    FOR SELECT USING (
        recorded_by = auth.uid() OR
        meeting_id IN (
            SELECT meeting_id FROM video_meeting_participants 
            WHERE user_id = auth.uid()
        )
    );

-- Politique pour que les admins puissent voir tous les enregistrements
DROP POLICY IF EXISTS "Admins can view all recordings" ON meeting_recordings;
CREATE POLICY "Admins can view all recordings" ON meeting_recordings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Politique pour créer des enregistrements
DROP POLICY IF EXISTS "Users can create recordings" ON meeting_recordings;
CREATE POLICY "Users can create recordings" ON meeting_recordings
    FOR INSERT WITH CHECK (
        recorded_by = auth.uid() AND
        meeting_id IN (
            SELECT meeting_id FROM video_meeting_participants 
            WHERE user_id = auth.uid()
        )
    );

-- Politique pour mettre à jour les enregistrements
DROP POLICY IF EXISTS "Users can update their recordings" ON meeting_recordings;
CREATE POLICY "Users can update their recordings" ON meeting_recordings
    FOR UPDATE USING (
        recorded_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- =========================================
-- 4. TRIGGER POUR MEETING_RECORDINGS
-- =========================================

-- Trigger pour mise à jour automatique de updated_at
DROP TRIGGER IF EXISTS trigger_update_meeting_recordings_updated_at ON meeting_recordings;
CREATE TRIGGER trigger_update_meeting_recordings_updated_at
    BEFORE UPDATE ON meeting_recordings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =========================================
-- 5. RECRÉATION DE LA VUE MEETING_DETAILS CORRIGÉE
-- =========================================

-- Supprimer et recréer la vue meeting_details avec vérification de l'existence de meeting_recordings
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

-- =========================================
-- 6. FONCTIONS RPC POUR LES ENREGISTREMENTS
-- =========================================

-- Fonction pour démarrer un enregistrement
CREATE OR REPLACE FUNCTION start_meeting_recording(
    p_meeting_id UUID,
    p_meeting_room_id TEXT,
    p_recorded_by UUID
)
RETURNS UUID AS $$
DECLARE
    recording_id UUID;
BEGIN
    -- Vérifier que l'utilisateur fait partie de la réunion
    IF NOT EXISTS (
        SELECT 1 FROM video_meeting_participants 
        WHERE meeting_id = p_meeting_id AND user_id = p_recorded_by
    ) THEN
        RAISE EXCEPTION 'Vous ne faites pas partie de cette réunion';
    END IF;
    
    -- Créer l'enregistrement
    INSERT INTO meeting_recordings (
        meeting_id, 
        meeting_room_id, 
        recorded_by, 
        status
    )
    VALUES (
        p_meeting_id, 
        p_meeting_room_id, 
        p_recorded_by, 
        'recording'
    )
    RETURNING id INTO recording_id;
    
    -- Marquer la réunion comme ayant des enregistrements disponibles
    UPDATE video_meetings 
    SET recording_available = true 
    WHERE id = p_meeting_id;
    
    RETURN recording_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour terminer un enregistrement
CREATE OR REPLACE FUNCTION end_meeting_recording(
    p_recording_id UUID,
    p_file_url TEXT DEFAULT NULL,
    p_duration_seconds INTEGER DEFAULT 0,
    p_file_size_bytes BIGINT DEFAULT 0
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Mettre à jour l'enregistrement
    UPDATE meeting_recordings 
    SET 
        status = 'completed',
        ended_at = NOW(),
        file_url = p_file_url,
        duration_seconds = p_duration_seconds,
        file_size_bytes = p_file_size_bytes
    WHERE id = p_recording_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir les enregistrements d'une réunion
CREATE OR REPLACE FUNCTION get_meeting_recordings(p_meeting_id UUID)
RETURNS TABLE (
    id UUID,
    file_url TEXT,
    thumbnail_url TEXT,
    duration_seconds INTEGER,
    file_size_bytes BIGINT,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    recorded_by_name TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mr.id,
        mr.file_url,
        mr.thumbnail_url,
        mr.duration_seconds,
        mr.file_size_bytes,
        mr.started_at,
        mr.ended_at,
        COALESCE(p.first_name || ' ' || p.last_name, p.email) as recorded_by_name
    FROM meeting_recordings mr
    LEFT JOIN profiles p ON mr.recorded_by = p.user_id
    WHERE mr.meeting_id = p_meeting_id 
      AND mr.status = 'completed'
    ORDER BY mr.started_at DESC;
END;
$$;

-- =========================================
-- 7. PERMISSIONS
-- =========================================

-- Accorder les permissions nécessaires
GRANT SELECT, INSERT, UPDATE ON meeting_recordings TO authenticated;
GRANT EXECUTE ON FUNCTION start_meeting_recording(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION end_meeting_recording(UUID, TEXT, INTEGER, BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_meeting_recordings(UUID) TO authenticated;

-- =========================================
-- SCRIPT TERMINÉ AVEC SUCCÈS
-- =========================================

-- Ce script a créé :
-- ✅ Table meeting_recordings avec toutes les colonnes nécessaires
-- ✅ Index pour optimiser les performances
-- ✅ Politiques RLS pour la sécurité
-- ✅ Triggers pour mise à jour automatique
-- ✅ Vue meeting_details corrigée
-- ✅ Fonctions RPC pour gérer les enregistrements
-- ✅ Permissions appropriées

COMMENT ON TABLE meeting_recordings IS 'Table des enregistrements de réunions vidéo';
COMMENT ON FUNCTION start_meeting_recording(UUID, TEXT, UUID) IS 'Démarre un enregistrement de réunion';
COMMENT ON FUNCTION end_meeting_recording(UUID, TEXT, INTEGER, BIGINT) IS 'Termine un enregistrement de réunion';
COMMENT ON FUNCTION get_meeting_recordings(UUID) IS 'Récupère les enregistrements d''une réunion'; 