-- =========================================
-- SYSTÈME DE VIDÉOCONFÉRENCES AMÉLIORÉ POUR APHS
-- Script à exécuter dans Supabase Script Editor
-- Inclut les améliorations pour projets et enregistrements
-- =========================================

-- =========================================
-- 1. TABLE DES RÉUNIONS VIDÉO (Améliorée)
-- =========================================
CREATE TABLE IF NOT EXISTS video_meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    room_id TEXT NOT NULL UNIQUE,
    description TEXT,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL, -- Nouveau: lien avec les projets
    scheduled_time TIMESTAMP WITH TIME ZONE,
    is_instant BOOLEAN DEFAULT false,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'ended', 'cancelled')),
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    recording_available BOOLEAN DEFAULT false, -- Nouveau: indicateur d'enregistrement disponible
    deleted_at TIMESTAMP WITH TIME ZONE -- Nouveau: suppression logique
);

-- =========================================
-- 2. TABLE DES PARTICIPANTS AUX RÉUNIONS
-- =========================================
CREATE TABLE IF NOT EXISTS video_meeting_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES video_meetings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('host', 'participant')),
    status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'accepted', 'declined', 'joined')),
    joined_at TIMESTAMP WITH TIME ZONE,
    left_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(meeting_id, user_id)
);

-- =========================================
-- 3. TABLE DES DEMANDES DE RÉUNION (Améliorée)
-- =========================================
CREATE TABLE IF NOT EXISTS video_meeting_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL, -- Nouveau: lien avec les projets
    requested_by UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
    requested_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    responded_at TIMESTAMP WITH TIME ZONE,
    responded_by UUID,
    response_message TEXT,
    created_meeting_id UUID REFERENCES video_meetings(id) ON DELETE SET NULL
);

-- =========================================
-- 4. TABLE DES PARTICIPANTS SUGGÉRÉS POUR LES DEMANDES
-- =========================================
CREATE TABLE IF NOT EXISTS video_meeting_request_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES video_meeting_requests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(request_id, user_id)
);

-- =========================================
-- 5. TABLE DES ENREGISTREMENTS DE RÉUNIONS (Améliorée)
-- =========================================
CREATE TABLE IF NOT EXISTS meeting_recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES video_meetings(id) ON DELETE CASCADE,
    meeting_room_id TEXT NOT NULL,
    recorded_by UUID NOT NULL REFERENCES auth.users(id),
    status TEXT NOT NULL DEFAULT 'recording' CHECK (status IN ('recording', 'completed', 'failed')),
    file_path TEXT,
    file_url TEXT,
    thumbnail_url TEXT, -- Nouveau: vignette de l'enregistrement
    duration_seconds INTEGER DEFAULT 0,
    file_size_bytes BIGINT DEFAULT 0, -- Nouveau: taille du fichier
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =========================================
-- 6. INDEX POUR OPTIMISER LES PERFORMANCES
-- =========================================
CREATE INDEX IF NOT EXISTS idx_video_meetings_created_by ON video_meetings(created_by);
CREATE INDEX IF NOT EXISTS idx_video_meetings_status ON video_meetings(status);
CREATE INDEX IF NOT EXISTS idx_video_meetings_scheduled_time ON video_meetings(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_video_meetings_room_id ON video_meetings(room_id);
CREATE INDEX IF NOT EXISTS idx_video_meetings_project_id ON video_meetings(project_id);
CREATE INDEX IF NOT EXISTS idx_video_meetings_deleted_at ON video_meetings(deleted_at);

CREATE INDEX IF NOT EXISTS idx_video_meeting_participants_meeting_id ON video_meeting_participants(meeting_id);
CREATE INDEX IF NOT EXISTS idx_video_meeting_participants_user_id ON video_meeting_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_video_meeting_participants_role ON video_meeting_participants(role);

CREATE INDEX IF NOT EXISTS idx_video_meeting_requests_requested_by ON video_meeting_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_video_meeting_requests_status ON video_meeting_requests(status);
CREATE INDEX IF NOT EXISTS idx_video_meeting_requests_scheduled_time ON video_meeting_requests(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_video_meeting_requests_project_id ON video_meeting_requests(project_id);

CREATE INDEX IF NOT EXISTS idx_video_meeting_request_participants_request_id ON video_meeting_request_participants(request_id);
CREATE INDEX IF NOT EXISTS idx_video_meeting_request_participants_user_id ON video_meeting_request_participants(user_id);

CREATE INDEX IF NOT EXISTS idx_meeting_recordings_meeting_id ON meeting_recordings(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_recordings_recorded_by ON meeting_recordings(recorded_by);
CREATE INDEX IF NOT EXISTS idx_meeting_recordings_status ON meeting_recordings(status);

-- =========================================
-- 7. TRIGGERS POUR MISE À JOUR AUTOMATIQUE
-- =========================================
CREATE OR REPLACE FUNCTION update_video_meetings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_video_meetings_updated_at ON video_meetings;
CREATE TRIGGER trigger_update_video_meetings_updated_at
    BEFORE UPDATE ON video_meetings
    FOR EACH ROW
    EXECUTE FUNCTION update_video_meetings_updated_at();

CREATE OR REPLACE FUNCTION update_meeting_recordings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_meeting_recordings_updated_at ON meeting_recordings;
CREATE TRIGGER trigger_update_meeting_recordings_updated_at
    BEFORE UPDATE ON meeting_recordings
    FOR EACH ROW
    EXECUTE FUNCTION update_meeting_recordings_updated_at();

-- =========================================
-- 8. FONCTIONS RPC AMÉLIORÉES
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

-- Fonction pour marquer une réunion comme terminée
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

-- =========================================
-- 9. POLITIQUES DE SÉCURITÉ RLS (Row Level Security)
-- =========================================

-- Activer RLS sur toutes les tables
ALTER TABLE video_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_meeting_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_meeting_request_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_recordings ENABLE ROW LEVEL SECURITY;

-- Politiques pour video_meetings
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

DROP POLICY IF EXISTS "Utilisateurs peuvent créer des réunions" ON video_meetings;
CREATE POLICY "Utilisateurs peuvent créer des réunions" ON video_meetings
    FOR INSERT WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Créateurs et admins peuvent modifier" ON video_meetings;
CREATE POLICY "Créateurs et admins peuvent modifier" ON video_meetings
    FOR UPDATE USING (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Politiques pour meeting_recordings
DROP POLICY IF EXISTS "Utilisateurs peuvent voir les enregistrements de leurs réunions" ON meeting_recordings;
CREATE POLICY "Utilisateurs peuvent voir les enregistrements de leurs réunions" ON meeting_recordings
    FOR SELECT USING (
        recorded_by = auth.uid() OR
        meeting_id IN (
            SELECT meeting_id FROM video_meeting_participants 
            WHERE user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Utilisateurs peuvent créer des enregistrements" ON meeting_recordings;
CREATE POLICY "Utilisateurs peuvent créer des enregistrements" ON meeting_recordings
    FOR INSERT WITH CHECK (recorded_by = auth.uid());

DROP POLICY IF EXISTS "Créateurs peuvent modifier leurs enregistrements" ON meeting_recordings;
CREATE POLICY "Créateurs peuvent modifier leurs enregistrements" ON meeting_recordings
    FOR UPDATE USING (recorded_by = auth.uid());

-- =========================================
-- 10. VUES POUR FACILITER LES REQUÊTES
-- =========================================

-- Vue pour les réunions avec informations complètes
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
    COUNT(mp.id) as participant_count,
    COUNT(mr.id) as recording_count
FROM video_meetings m
LEFT JOIN projects p ON m.project_id = p.id
LEFT JOIN video_meeting_participants mp ON m.id = mp.meeting_id
LEFT JOIN meeting_recordings mr ON m.id = mr.meeting_id AND mr.status = 'completed'
WHERE m.deleted_at IS NULL
GROUP BY m.id, p.name;

-- Vue pour les demandes de réunion avec informations complètes
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
-- 11. DONNÉES D'EXEMPLE (OPTIONNEL)
-- =========================================

-- Commentez cette section si vous ne voulez pas de données d'exemple

-- COMMENT: Ajouter des données d'exemple pour tester le système
-- INSERT INTO video_meetings (title, room_id, description, is_instant, created_by) 
-- VALUES 
-- ('Réunion de démonstration', 'demo-room-123', 'Réunion de test du système', true, auth.uid())
-- ON CONFLICT DO NOTHING; 