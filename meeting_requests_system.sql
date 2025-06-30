-- ==============================================
-- SYSTÈME DE DEMANDES DE RÉUNION AMÉLIORÉ
-- ==============================================

-- Table des demandes de réunion
CREATE TABLE IF NOT EXISTS video_meeting_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    scheduled_time TIMESTAMPTZ,
    response_message TEXT,
    responded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des participants suggérés pour une demande
CREATE TABLE IF NOT EXISTS video_meeting_request_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    request_id UUID NOT NULL REFERENCES video_meeting_requests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(request_id, user_id)
);

-- Ajouter les colonnes manquantes aux réunions vidéo si elles n'existent pas
DO $$ 
BEGIN
    -- Ajouter project_id si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'video_meetings' AND column_name = 'project_id'
    ) THEN
        ALTER TABLE video_meetings ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
    END IF;
    
    -- Ajouter response_message si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'video_meeting_requests' AND column_name = 'response_message'
    ) THEN
        ALTER TABLE video_meeting_requests ADD COLUMN response_message TEXT;
    END IF;
    
    -- Ajouter responded_by si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'video_meeting_requests' AND column_name = 'responded_by'
    ) THEN
        ALTER TABLE video_meeting_requests ADD COLUMN responded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
    
    -- Ajouter responded_at si elle n'existe pas
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'video_meeting_requests' AND column_name = 'responded_at'
    ) THEN
        ALTER TABLE video_meeting_requests ADD COLUMN responded_at TIMESTAMPTZ;
    END IF;
END $$;

-- Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_video_meeting_requests_status ON video_meeting_requests(status);
CREATE INDEX IF NOT EXISTS idx_video_meeting_requests_requested_by ON video_meeting_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_video_meeting_requests_created_at ON video_meeting_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_video_meeting_request_participants_request_id ON video_meeting_request_participants(request_id);

-- Politiques RLS pour les demandes de réunion
ALTER TABLE video_meeting_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_meeting_request_participants ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent voir leurs propres demandes et les admins peuvent tout voir
CREATE POLICY "Users can view own meeting requests" ON video_meeting_requests
    FOR SELECT USING (
        requested_by = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Les utilisateurs connectés peuvent créer des demandes
CREATE POLICY "Authenticated users can create meeting requests" ON video_meeting_requests
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND 
        requested_by = auth.uid()
    );

-- Seuls les admins peuvent répondre aux demandes
CREATE POLICY "Admins can update meeting requests" ON video_meeting_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Politique pour les participants aux demandes
CREATE POLICY "Users can view meeting request participants" ON video_meeting_request_participants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM video_meeting_requests 
            WHERE id = request_id AND (
                requested_by = auth.uid() OR 
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE user_id = auth.uid() AND role = 'admin'
                )
            )
        )
    );

CREATE POLICY "Users can manage meeting request participants" ON video_meeting_request_participants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM video_meeting_requests 
            WHERE id = request_id AND requested_by = auth.uid()
        ) OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Fonction pour obtenir les projets accessibles à un utilisateur
CREATE OR REPLACE FUNCTION get_user_accessible_projects(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    description TEXT,
    status VARCHAR
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT 
        p.id, 
        p.name, 
        p.description, 
        p.status
    FROM projects p
    WHERE EXISTS (
        SELECT 1 FROM project_intervenants pi 
        WHERE pi.project_id = p.id AND pi.intervenant_id = p_user_id
    )
    OR EXISTS (
        SELECT 1 FROM profiles prof 
        WHERE prof.user_id = p_user_id AND prof.role = 'admin'
    )
    ORDER BY p.name;
END;
$$;

-- Fonction pour obtenir les membres d'un groupe de travail
CREATE OR REPLACE FUNCTION get_workgroup_members(p_user_id UUID)
RETURNS TABLE (
    user_id UUID,
    first_name VARCHAR,
    last_name VARCHAR,
    email VARCHAR,
    workgroup_name VARCHAR
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT 
        p.user_id,
        p.first_name,
        p.last_name,
        p.email,
        wg.name as workgroup_name
    FROM profiles p
    JOIN workgroup_members wm1 ON p.user_id = wm1.user_id
    JOIN workgroups wg ON wm1.workgroup_id = wg.id
    WHERE wg.id IN (
        SELECT wm2.workgroup_id 
        FROM workgroup_members wm2 
        WHERE wm2.user_id = p_user_id
    )
    AND p.user_id != p_user_id -- Exclure l'utilisateur lui-même
    ORDER BY p.first_name, p.last_name;
END;
$$;

-- Fonction pour supprimer une réunion de manière sécurisée
CREATE OR REPLACE FUNCTION delete_meeting_safely(
    p_meeting_id UUID,
    p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_admin BOOLEAN;
    v_is_creator BOOLEAN;
    v_meeting_status VARCHAR;
BEGIN
    -- Vérifier si l'utilisateur est admin
    SELECT (role = 'admin') INTO v_is_admin
    FROM profiles 
    WHERE user_id = p_user_id;
    
    -- Vérifier si l'utilisateur est le créateur de la réunion
    SELECT 
        (created_by = p_user_id),
        status
    INTO v_is_creator, v_meeting_status
    FROM video_meetings 
    WHERE id = p_meeting_id;
    
    -- Vérifier les permissions
    IF NOT (v_is_admin OR v_is_creator) THEN
        RAISE EXCEPTION 'Vous n''avez pas les permissions pour supprimer cette réunion';
    END IF;
    
    -- Ne pas permettre la suppression de réunions actives sauf pour les admins
    IF v_meeting_status = 'active' AND NOT v_is_admin THEN
        RAISE EXCEPTION 'Impossible de supprimer une réunion en cours';
    END IF;
    
    -- Supprimer la réunion et ses données associées
    DELETE FROM video_meeting_participants WHERE meeting_id = p_meeting_id;
    DELETE FROM video_meetings WHERE id = p_meeting_id;
END;
$$;

-- Créer des index sur les tables de notifications si elles existent
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'notifications'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
        CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
        CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
    END IF;
END $$;

-- Mise à jour automatique du timestamp updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour video_meeting_requests
DROP TRIGGER IF EXISTS update_video_meeting_requests_updated_at ON video_meeting_requests;
CREATE TRIGGER update_video_meeting_requests_updated_at
    BEFORE UPDATE ON video_meeting_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Vue pour simplifier l'accès aux détails des demandes de réunion
CREATE OR REPLACE VIEW meeting_request_details AS
SELECT 
    vmr.id,
    vmr.title,
    vmr.description,
    vmr.project_id,
    p.name as project_name,
    vmr.requested_by,
    prof.first_name as requester_first_name,
    prof.last_name as requester_last_name,
    prof.email as requester_email,
    vmr.status,
    vmr.scheduled_time,
    vmr.response_message,
    vmr.responded_by,
    resp_prof.first_name as responder_first_name,
    resp_prof.last_name as responder_last_name,
    vmr.responded_at,
    vmr.created_at,
    vmr.updated_at
FROM video_meeting_requests vmr
LEFT JOIN projects p ON vmr.project_id = p.id
LEFT JOIN profiles prof ON vmr.requested_by = prof.user_id
LEFT JOIN profiles resp_prof ON vmr.responded_by = resp_prof.user_id;

COMMENT ON TABLE video_meeting_requests IS 'Table des demandes de réunion des intervenants';
COMMENT ON TABLE video_meeting_request_participants IS 'Table des participants suggérés pour les demandes de réunion';
COMMENT ON VIEW meeting_request_details IS 'Vue détaillée des demandes de réunion avec informations des utilisateurs et projets';

-- Accorder les permissions nécessaires
GRANT SELECT, INSERT, UPDATE ON video_meeting_requests TO authenticated;
GRANT SELECT, INSERT, DELETE ON video_meeting_request_participants TO authenticated;
GRANT SELECT ON meeting_request_details TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_accessible_projects(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_workgroup_members(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_meeting_safely(UUID, UUID) TO authenticated; 