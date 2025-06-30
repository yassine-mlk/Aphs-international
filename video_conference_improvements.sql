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
    user_is_creator BOOLEAN;
    user_is_admin BOOLEAN;
BEGIN
    -- Vérifier si la réunion existe
    SELECT EXISTS(SELECT 1 FROM video_meetings WHERE id = p_meeting_id) INTO meeting_exists;
    
    IF NOT meeting_exists THEN
        RAISE EXCEPTION 'Réunion introuvable';
    END IF;
    
    -- Vérifier si l'utilisateur est le créateur
    SELECT EXISTS(
        SELECT 1 FROM video_meetings 
        WHERE id = p_meeting_id AND created_by = p_user_id
    ) INTO user_is_creator;
    
    -- Vérifier si l'utilisateur est admin (à adapter selon votre logique)
    -- Pour l'instant, on considère que seul le créateur peut supprimer
    
    IF NOT user_is_creator THEN
        RAISE EXCEPTION 'Accès refusé: seul le créateur peut supprimer cette réunion';
    END IF;
    
    -- Suppression logique
    UPDATE video_meetings 
    SET deleted_at = NOW() 
    WHERE id = p_meeting_id;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Erreur lors de la suppression: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction améliorée pour rejoindre une réunion
CREATE OR REPLACE FUNCTION join_meeting_improved(
    p_meeting_id UUID,
    p_user_id UUID
)
RETURNS TABLE(success BOOLEAN, is_moderator BOOLEAN, room_id TEXT) AS $$
DECLARE
    meeting_creator UUID;
    meeting_room_id TEXT;
    participant_exists BOOLEAN;
BEGIN
    -- Récupérer les infos de la réunion
    SELECT created_by, room_id 
    INTO meeting_creator, meeting_room_id
    FROM video_meetings 
    WHERE id = p_meeting_id;
    
    IF meeting_room_id IS NULL THEN
        RAISE EXCEPTION 'Réunion introuvable';
    END IF;
    
    -- Vérifier si l'utilisateur est déjà participant
    SELECT EXISTS(
        SELECT 1 FROM video_meeting_participants 
        WHERE meeting_id = p_meeting_id AND user_id = p_user_id
    ) INTO participant_exists;
    
    IF participant_exists THEN
        -- Mettre à jour le statut
        UPDATE video_meeting_participants 
        SET status = 'joined', joined_at = NOW()
        WHERE meeting_id = p_meeting_id AND user_id = p_user_id;
    ELSE
        -- Ajouter comme participant
        INSERT INTO video_meeting_participants (meeting_id, user_id, role, status, joined_at)
        VALUES (
            p_meeting_id, 
            p_user_id, 
            CASE WHEN p_user_id = meeting_creator THEN 'host' ELSE 'participant' END,
            'joined', 
            NOW()
        );
    END IF;
    
    -- Marquer la réunion comme active
    UPDATE video_meetings 
    SET status = 'active' 
    WHERE id = p_meeting_id AND status = 'scheduled';
    
    -- Retourner les résultats
    RETURN QUERY SELECT 
        TRUE as success,
        (p_user_id = meeting_creator) as is_moderator,
        meeting_room_id as room_id;
        
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT FALSE, FALSE, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir les participants d'une réunion avec leurs noms
CREATE OR REPLACE FUNCTION get_meeting_participants_with_names(
    p_meeting_id UUID
)
RETURNS TABLE(
    participant_id UUID,
    user_id UUID,
    user_name TEXT,
    user_email TEXT,
    role TEXT,
    status TEXT,
    joined_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vmp.id as participant_id,
        vmp.user_id,
        COALESCE(
            TRIM(
                COALESCE(u.raw_user_meta_data->>'first_name', '') || ' ' || 
                COALESCE(u.raw_user_meta_data->>'last_name', '')
            ),
            u.email,
            'Utilisateur inconnu'
        ) as user_name,
        u.email as user_email,
        vmp.role,
        vmp.status,
        vmp.joined_at
    FROM video_meeting_participants vmp
    LEFT JOIN auth.users u ON u.id = vmp.user_id
    WHERE vmp.meeting_id = p_meeting_id
    ORDER BY vmp.role DESC, vmp.joined_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;



-- =========================================
-- 5. VUES UTILES
-- =========================================

-- Vue pour afficher les réunions avec le nombre de participants
CREATE OR REPLACE VIEW meeting_summary AS
SELECT 
    vm.id,
    vm.title,
    vm.room_id,
    vm.description,
    vm.scheduled_time,
    vm.status,
    vm.created_by,
    vm.created_at,
    COUNT(vmp.id) as participant_count,
    COUNT(CASE WHEN vmp.status = 'joined' THEN 1 END) as active_participants
FROM video_meetings vm
LEFT JOIN video_meeting_participants vmp ON vm.id = vmp.meeting_id
WHERE vm.deleted_at IS NULL
GROUP BY vm.id, vm.title, vm.room_id, vm.description, vm.scheduled_time, vm.status, vm.created_by, vm.created_at;

-- Commentaires
COMMENT ON FUNCTION join_meeting_improved IS 'Fonction améliorée pour rejoindre une réunion - ajoute automatiquement l''utilisateur comme participant si nécessaire';
COMMENT ON FUNCTION get_meeting_participants_with_names IS 'Récupère la liste des participants d''une réunion avec leurs noms complets';
COMMENT ON VIEW meeting_summary IS 'Vue résumé des réunions avec statistiques des participants';

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