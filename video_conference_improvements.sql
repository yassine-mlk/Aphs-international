-- =========================================
-- AMÉLIORATIONS SYSTÈME VIDÉOCONFÉRENCE APHS
-- Script d'amélioration à exécuter après le script principal
-- =========================================

-- =========================================
-- 1. AJOUT DES COLONNES MANQUANTES
-- =========================================

-- Ajouter la colonne project_id aux réunions
ALTER TABLE video_meetings 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- Ajouter des colonnes pour la gestion améliorée
ALTER TABLE video_meetings 
ADD COLUMN IF NOT EXISTS recording_available BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Ajouter la colonne project_id aux demandes de réunion
ALTER TABLE video_meeting_requests 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- Ajouter left_at aux participants
ALTER TABLE video_meeting_participants 
ADD COLUMN IF NOT EXISTS left_at TIMESTAMP WITH TIME ZONE;

-- Améliorer la table meeting_recordings
ALTER TABLE meeting_recordings 
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT DEFAULT 0;

-- =========================================
-- 2. NOUVEAUX INDEX
-- =========================================

CREATE INDEX IF NOT EXISTS idx_video_meetings_project_id ON video_meetings(project_id);
CREATE INDEX IF NOT EXISTS idx_video_meetings_deleted_at ON video_meetings(deleted_at);
CREATE INDEX IF NOT EXISTS idx_video_meeting_requests_project_id ON video_meeting_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_meeting_recordings_meeting_id ON meeting_recordings(meeting_id);

-- =========================================
-- 3. FONCTIONS AMÉLIORÉES
-- =========================================

-- Fonction pour supprimer une réunion (suppression logique)
CREATE OR REPLACE FUNCTION delete_meeting(
    p_meeting_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    meeting_exists BOOLEAN;
    is_admin BOOLEAN;
    is_creator BOOLEAN;
BEGIN
    -- Vérifier si la réunion existe et n'est pas déjà supprimée
    SELECT EXISTS(
        SELECT 1 FROM video_meetings 
        WHERE id = p_meeting_id AND deleted_at IS NULL
    ) INTO meeting_exists;
    
    IF NOT meeting_exists THEN
        RAISE EXCEPTION 'Réunion introuvable ou déjà supprimée';
    END IF;
    
    -- Vérifier si l'utilisateur est admin
    SELECT EXISTS(
        SELECT 1 FROM profiles 
        WHERE user_id = p_user_id AND role = 'admin'
    ) INTO is_admin;
    
    -- Vérifier si l'utilisateur est le créateur
    SELECT EXISTS(
        SELECT 1 FROM video_meetings 
        WHERE id = p_meeting_id AND created_by = p_user_id
    ) INTO is_creator;
    
    -- Seuls les admins ou les créateurs peuvent supprimer
    IF NOT (is_admin OR is_creator) THEN
        RAISE EXCEPTION 'Vous n''êtes pas autorisé à supprimer cette réunion';
    END IF;
    
    -- Suppression logique
    UPDATE video_meetings 
    SET deleted_at = NOW(), status = 'cancelled'
    WHERE id = p_meeting_id;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Erreur lors de la suppression: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir les enregistrements d'une réunion
CREATE OR REPLACE FUNCTION get_meeting_recordings(
    p_meeting_id UUID,
    p_user_id UUID
)
RETURNS TABLE(
    id UUID,
    file_url TEXT,
    thumbnail_url TEXT,
    duration_seconds INTEGER,
    file_size_bytes BIGINT,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    has_access BOOLEAN;
    is_admin BOOLEAN;
BEGIN
    -- Vérifier si l'utilisateur est admin
    SELECT EXISTS(
        SELECT 1 FROM profiles 
        WHERE user_id = p_user_id AND role = 'admin'
    ) INTO is_admin;
    
    -- Vérifier si l'utilisateur a accès à la réunion
    SELECT EXISTS(
        SELECT 1 FROM video_meeting_participants 
        WHERE meeting_id = p_meeting_id AND user_id = p_user_id
    ) OR is_admin INTO has_access;
    
    IF NOT has_access THEN
        RAISE EXCEPTION 'Accès refusé aux enregistrements de cette réunion';
    END IF;
    
    RETURN QUERY
    SELECT 
        r.id,
        r.file_url,
        r.thumbnail_url,
        r.duration_seconds,
        r.file_size_bytes,
        r.started_at,
        r.ended_at
    FROM meeting_recordings r
    WHERE r.meeting_id = p_meeting_id 
    AND r.status = 'completed'
    ORDER BY r.started_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour marquer une réunion comme terminée proprement
CREATE OR REPLACE FUNCTION end_meeting_properly(
    p_meeting_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    is_authorized BOOLEAN;
    meeting_exists BOOLEAN;
BEGIN
    -- Vérifier si la réunion existe et est active
    SELECT EXISTS(
        SELECT 1 FROM video_meetings 
        WHERE id = p_meeting_id AND status = 'active' AND deleted_at IS NULL
    ) INTO meeting_exists;
    
    IF NOT meeting_exists THEN
        RAISE EXCEPTION 'Réunion introuvable ou pas en cours';
    END IF;
    
    -- Vérifier si l'utilisateur est autorisé (admin ou host)
    SELECT EXISTS(
        SELECT 1 FROM profiles 
        WHERE user_id = p_user_id AND role = 'admin'
    ) OR EXISTS(
        SELECT 1 FROM video_meeting_participants 
        WHERE meeting_id = p_meeting_id AND user_id = p_user_id AND role = 'host'
    ) INTO is_authorized;
    
    IF NOT is_authorized THEN
        RAISE EXCEPTION 'Vous n''êtes pas autorisé à terminer cette réunion';
    END IF;
    
    -- Terminer la réunion
    UPDATE video_meetings 
    SET status = 'ended', ended_at = NOW()
    WHERE id = p_meeting_id;
    
    -- Marquer tous les participants comme ayant quitté
    UPDATE video_meeting_participants
    SET left_at = NOW()
    WHERE meeting_id = p_meeting_id AND left_at IS NULL;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Erreur lors de la fin de réunion: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir les projets accessibles à un utilisateur
CREATE OR REPLACE FUNCTION get_user_accessible_projects(p_user_id UUID)
RETURNS TABLE(
    id UUID,
    name TEXT,
    description TEXT,
    status TEXT
) AS $$
DECLARE
    is_admin BOOLEAN;
BEGIN
    -- Vérifier si l'utilisateur est admin
    SELECT EXISTS(
        SELECT 1 FROM profiles 
        WHERE user_id = p_user_id AND role = 'admin'
    ) INTO is_admin;
    
    IF is_admin THEN
        -- Les admins voient tous les projets
        RETURN QUERY
        SELECT p.id, p.name, p.description, p.status
        FROM projects p
        WHERE p.status IN ('active', 'paused')
        ORDER BY p.name;
    ELSE
        -- Les autres utilisateurs voient leurs projets + ceux où ils sont membres
        RETURN QUERY
        SELECT p.id, p.name, p.description, p.status
        FROM projects p
        WHERE (p.created_by = p_user_id OR 
               p.id IN (
                   SELECT pm.project_id 
                   FROM project_members pm 
                   WHERE pm.user_id = p_user_id
               ))
        AND p.status IN ('active', 'paused')
        ORDER BY p.name;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================
-- 4. MISES À JOUR DES POLITIQUES RLS
-- =========================================

-- Mise à jour pour exclure les réunions supprimées
DROP POLICY IF EXISTS "Utilisateurs peuvent voir leurs réunions" ON video_meetings;
CREATE POLICY "Utilisateurs peuvent voir leurs réunions" ON video_meetings
    FOR SELECT USING (
        deleted_at IS NULL AND (
            created_by = auth.uid() OR
            id IN (
                SELECT meeting_id FROM video_meeting_participants 
                WHERE user_id = auth.uid()
            ) OR
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE user_id = auth.uid() AND role = 'admin'
            )
        )
    );

-- Politique pour les admins pour supprimer
DROP POLICY IF EXISTS "Admins peuvent supprimer des réunions" ON video_meetings;
CREATE POLICY "Admins peuvent supprimer des réunions" ON video_meetings
    FOR UPDATE USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- =========================================
-- 5. VUES UTILES
-- =========================================

-- Vue pour les réunions avec informations de projet
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
    m.recording_available,
    COUNT(DISTINCT mp.id) as participant_count,
    COUNT(DISTINCT mr.id) as recording_count
FROM video_meetings m
LEFT JOIN projects p ON m.project_id = p.id
LEFT JOIN video_meeting_participants mp ON m.id = mp.meeting_id
LEFT JOIN meeting_recordings mr ON m.id = mr.meeting_id AND mr.status = 'completed'
WHERE m.deleted_at IS NULL
GROUP BY m.id, p.name;

-- Vue pour les demandes avec informations complètes
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
    COUNT(mrp.id) as suggested_participants_count
FROM video_meeting_requests mr
LEFT JOIN projects p ON mr.project_id = p.id
LEFT JOIN profiles prof ON mr.requested_by = prof.user_id
LEFT JOIN video_meeting_request_participants mrp ON mr.id = mrp.request_id
GROUP BY mr.id, p.name, prof.first_name, prof.last_name;

-- =========================================
-- 6. COMMENTAIRES
-- =========================================

COMMENT ON COLUMN video_meetings.project_id IS 'Référence au projet associé à la réunion';
COMMENT ON COLUMN video_meetings.recording_available IS 'Indique si des enregistrements sont disponibles';
COMMENT ON COLUMN video_meetings.deleted_at IS 'Date de suppression logique';
COMMENT ON COLUMN meeting_recordings.thumbnail_url IS 'URL de la vignette de l''enregistrement';
COMMENT ON COLUMN meeting_recordings.file_size_bytes IS 'Taille du fichier en octets';

-- =========================================
-- SCRIPT D'AMÉLIORATION TERMINÉ
-- ========================================= 