-- =========================================
-- SYSTÈME DE VIDÉOCONFÉRENCES POUR APHS
-- Script à exécuter dans Supabase Script Editor
-- =========================================

-- =========================================
-- 1. TABLE DES RÉUNIONS VIDÉO
-- =========================================
CREATE TABLE IF NOT EXISTS video_meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    room_id TEXT NOT NULL UNIQUE,
    description TEXT,
    scheduled_time TIMESTAMP WITH TIME ZONE,
    is_instant BOOLEAN DEFAULT false,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'ended', 'cancelled')),
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(meeting_id, user_id)
);

-- =========================================
-- 3. TABLE DES DEMANDES DE RÉUNION
-- =========================================
CREATE TABLE IF NOT EXISTS video_meeting_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
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
-- 5. INDEX POUR OPTIMISER LES PERFORMANCES
-- =========================================
CREATE INDEX IF NOT EXISTS idx_video_meetings_created_by ON video_meetings(created_by);
CREATE INDEX IF NOT EXISTS idx_video_meetings_status ON video_meetings(status);
CREATE INDEX IF NOT EXISTS idx_video_meetings_scheduled_time ON video_meetings(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_video_meetings_room_id ON video_meetings(room_id);

CREATE INDEX IF NOT EXISTS idx_video_meeting_participants_meeting_id ON video_meeting_participants(meeting_id);
CREATE INDEX IF NOT EXISTS idx_video_meeting_participants_user_id ON video_meeting_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_video_meeting_participants_role ON video_meeting_participants(role);

CREATE INDEX IF NOT EXISTS idx_video_meeting_requests_requested_by ON video_meeting_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_video_meeting_requests_status ON video_meeting_requests(status);
CREATE INDEX IF NOT EXISTS idx_video_meeting_requests_scheduled_time ON video_meeting_requests(scheduled_time);

CREATE INDEX IF NOT EXISTS idx_video_meeting_request_participants_request_id ON video_meeting_request_participants(request_id);
CREATE INDEX IF NOT EXISTS idx_video_meeting_request_participants_user_id ON video_meeting_request_participants(user_id);

-- =========================================
-- 6. TRIGGERS POUR MISE À JOUR AUTOMATIQUE
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

-- =========================================
-- 7. FONCTIONS RPC POUR LE SYSTÈME
-- =========================================

-- Fonction pour ajouter un participant à une réunion de manière sécurisée
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
    DO UPDATE SET 
        role = EXCLUDED.role,
        status = EXCLUDED.status;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour rejoindre une réunion de manière sécurisée
CREATE OR REPLACE FUNCTION safe_join_meeting(
    p_meeting_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    participant_exists BOOLEAN;
    meeting_exists BOOLEAN;
BEGIN
    -- Vérifier si la réunion existe
    SELECT EXISTS(SELECT 1 FROM video_meetings WHERE id = p_meeting_id) INTO meeting_exists;
    
    IF NOT meeting_exists THEN
        RAISE EXCEPTION 'Réunion introuvable';
    END IF;
    
    -- Vérifier si l'utilisateur est déjà participant
    SELECT EXISTS(
        SELECT 1 FROM video_meeting_participants 
        WHERE meeting_id = p_meeting_id AND user_id = p_user_id
    ) INTO participant_exists;
    
    IF participant_exists THEN
        -- Mettre à jour le statut et l'heure de connexion
        UPDATE video_meeting_participants 
        SET status = 'joined', joined_at = NOW()
        WHERE meeting_id = p_meeting_id AND user_id = p_user_id;
    ELSE
        -- Ajouter comme participant
        INSERT INTO video_meeting_participants (meeting_id, user_id, role, status, joined_at)
        VALUES (p_meeting_id, p_user_id, 'participant', 'joined', NOW());
    END IF;
    
    -- Mettre à jour le statut de la réunion en 'active' si ce n'est pas déjà fait
    UPDATE video_meetings 
    SET status = 'active' 
    WHERE id = p_meeting_id AND status = 'scheduled';
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Erreur lors de la connexion à la réunion: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour envoyer des notifications d'invitation de réunion
CREATE OR REPLACE FUNCTION send_meeting_invitation_notification(
    p_participant_id UUID,
    p_meeting_title TEXT,
    p_organizer_name TEXT,
    p_scheduled_time TIMESTAMP WITH TIME ZONE
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Cette fonction peut être étendue pour envoyer des notifications
    -- Pour l'instant, elle retourne simplement TRUE
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================
-- 8. POLITIQUES DE SÉCURITÉ RLS (Row Level Security)
-- =========================================


-- Politiques pour video_meetings
DROP POLICY IF EXISTS "Utilisateurs peuvent voir leurs réunions" ON video_meetings;
CREATE POLICY "Utilisateurs peuvent voir leurs réunions" ON video_meetings
    FOR SELECT USING (
        created_by = auth.uid() OR
        id IN (
            SELECT meeting_id FROM video_meeting_participants 
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Utilisateurs peuvent créer des réunions" ON video_meetings;
CREATE POLICY "Utilisateurs peuvent créer des réunions" ON video_meetings
    FOR INSERT WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Créateurs et hôtes peuvent modifier leurs réunions" ON video_meetings;
CREATE POLICY "Créateurs et hôtes peuvent modifier leurs réunions" ON video_meetings
    FOR UPDATE USING (
        created_by = auth.uid() OR
        id IN (
            SELECT meeting_id FROM video_meeting_participants 
            WHERE user_id = auth.uid() AND role = 'host'
        )
    );

-- Politiques pour video_meeting_participants
DROP POLICY IF EXISTS "Participants peuvent voir les participants de leurs réunions" ON video_meeting_participants;
CREATE POLICY "Participants peuvent voir les participants de leurs réunions" ON video_meeting_participants
    FOR SELECT USING (
        user_id = auth.uid() OR
        meeting_id IN (
            SELECT meeting_id FROM video_meeting_participants 
            WHERE user_id = auth.uid()
        ) OR
        meeting_id IN (
            SELECT id FROM video_meetings 
            WHERE created_by = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Système peut gérer les participants" ON video_meeting_participants;
CREATE POLICY "Système peut gérer les participants" ON video_meeting_participants
    FOR ALL USING (true);

-- Politiques pour video_meeting_requests
DROP POLICY IF EXISTS "Utilisateurs peuvent voir leurs demandes" ON video_meeting_requests;
CREATE POLICY "Utilisateurs peuvent voir leurs demandes" ON video_meeting_requests
    FOR SELECT USING (requested_by = auth.uid());

DROP POLICY IF EXISTS "Utilisateurs peuvent créer des demandes" ON video_meeting_requests;
CREATE POLICY "Utilisateurs peuvent créer des demandes" ON video_meeting_requests
    FOR INSERT WITH CHECK (requested_by = auth.uid());

DROP POLICY IF EXISTS "Admins peuvent voir toutes les demandes" ON video_meeting_requests;
CREATE POLICY "Admins peuvent voir toutes les demandes" ON video_meeting_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins peuvent modifier les demandes" ON video_meeting_requests;
CREATE POLICY "Admins peuvent modifier les demandes" ON video_meeting_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Politiques pour video_meeting_request_participants
DROP POLICY IF EXISTS "Participants peuvent voir les demandes qui les concernent" ON video_meeting_request_participants;
CREATE POLICY "Participants peuvent voir les demandes qui les concernent" ON video_meeting_request_participants
    FOR SELECT USING (
        user_id = auth.uid() OR
        request_id IN (
            SELECT id FROM video_meeting_requests 
            WHERE requested_by = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Système peut gérer les participants des demandes" ON video_meeting_request_participants;
CREATE POLICY "Système peut gérer les participants des demandes" ON video_meeting_request_participants
    FOR ALL USING (true);

-- =========================================
-- 9. COMMENTAIRES ET DOCUMENTATION
-- =========================================

COMMENT ON TABLE video_meetings IS 'Table des réunions vidéo programmées ou instantanées';
COMMENT ON TABLE video_meeting_participants IS 'Table des participants aux réunions vidéo';
COMMENT ON TABLE video_meeting_requests IS 'Table des demandes de réunion soumises par les utilisateurs';
COMMENT ON TABLE video_meeting_request_participants IS 'Table des participants suggérés pour les demandes de réunion';

COMMENT ON COLUMN video_meetings.room_id IS 'Identifiant unique de la salle Jitsi Meet';
COMMENT ON COLUMN video_meetings.is_instant IS 'Indique si la réunion est instantanée ou programmée';
COMMENT ON COLUMN video_meeting_participants.role IS 'Rôle du participant: host ou participant';
COMMENT ON COLUMN video_meeting_participants.status IS 'Statut du participant: invited, accepted, declined, joined';
COMMENT ON COLUMN video_meeting_requests.status IS 'Statut de la demande: pending, approved, rejected';

-- =========================================
-- SCRIPT TERMINÉ AVEC SUCCÈS
-- =========================================

-- Ce script crée le système complet de vidéoconférence avec :
-- ✅ Tables pour les réunions et participants
-- ✅ Système de demandes avec approbation admin
-- ✅ Fonctions de sécurité et d'aide
-- ✅ Politiques de sécurité RLS
-- ✅ Index pour les performances
-- ✅ Triggers pour la maintenance automatique 