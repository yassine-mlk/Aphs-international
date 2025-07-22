-- Script SQL simple pour la gestion des contacts autorisés
-- Version simplifiée et plus logique

-- Table pour stocker les contacts autorisés par intervenant
CREATE TABLE IF NOT EXISTS user_contacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Contrainte unique pour éviter les doublons
    UNIQUE(user_id, contact_id)
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_user_contacts_user_id ON user_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_contacts_contact_id ON user_contacts(contact_id);

-- Fonction pour ajouter un contact autorisé
CREATE OR REPLACE FUNCTION add_user_contact(
    p_user_id UUID,
    p_contact_id UUID,
    p_admin_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Vérifier que l'utilisateur qui ajoute est admin
    IF NOT EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = p_admin_id 
        AND raw_user_meta_data->>'role' = 'admin'
    ) THEN
        RETURN json_build_object('error', 'Accès non autorisé');
    END IF;
    
    -- Vérifier que les utilisateurs existent
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
        RETURN json_build_object('error', 'Utilisateur non trouvé');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_contact_id) THEN
        RETURN json_build_object('error', 'Contact non trouvé');
    END IF;
    
    -- Vérifier que ce n'est pas le même utilisateur
    IF p_user_id = p_contact_id THEN
        RETURN json_build_object('error', 'Un utilisateur ne peut pas s''ajouter lui-même');
    END IF;
    
    -- Ajouter le contact
    INSERT INTO user_contacts (user_id, contact_id, created_by)
    VALUES (p_user_id, p_contact_id, p_admin_id)
    ON CONFLICT (user_id, contact_id) DO NOTHING;
    
    RETURN json_build_object('success', true, 'message', 'Contact ajouté avec succès');
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('error', SQLERRM);
END;
$$;

-- Fonction pour supprimer un contact autorisé
CREATE OR REPLACE FUNCTION remove_user_contact(
    p_user_id UUID,
    p_contact_id UUID,
    p_admin_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Vérifier que l'utilisateur qui supprime est admin
    IF NOT EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = p_admin_id 
        AND raw_user_meta_data->>'role' = 'admin'
    ) THEN
        RETURN json_build_object('error', 'Accès non autorisé');
    END IF;
    
    -- Supprimer le contact
    DELETE FROM user_contacts 
    WHERE user_id = p_user_id AND contact_id = p_contact_id;
    
    RETURN json_build_object('success', true, 'message', 'Contact supprimé avec succès');
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('error', SQLERRM);
END;
$$;

-- Fonction pour récupérer les contacts autorisés d'un utilisateur
CREATE OR REPLACE FUNCTION get_user_contacts(p_user_id UUID)
RETURNS TABLE (
    contact_id UUID,
    contact_email VARCHAR(255),
    contact_first_name VARCHAR(255),
    contact_last_name VARCHAR(255),
    contact_role VARCHAR(255),
    contact_specialty VARCHAR(255)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id as contact_id,
        u.email as contact_email,
        u.raw_user_meta_data->>'first_name' as contact_first_name,
        u.raw_user_meta_data->>'last_name' as contact_last_name,
        u.raw_user_meta_data->>'role' as contact_role,
        u.raw_user_meta_data->>'specialty' as contact_specialty
    FROM user_contacts uc
    JOIN auth.users u ON uc.contact_id = u.id
    WHERE uc.user_id = p_user_id
    ORDER BY u.raw_user_meta_data->>'first_name', u.raw_user_meta_data->>'last_name';
END;
$$;

-- Fonction pour récupérer le nombre de contacts d'un utilisateur
CREATE OR REPLACE FUNCTION get_user_contacts_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    contact_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO contact_count
    FROM user_contacts uc
    JOIN auth.users u ON uc.contact_id = u.id
    WHERE uc.user_id = p_user_id;
    
    RETURN contact_count;
END;
$$;

-- Politiques RLS (Row Level Security)
ALTER TABLE user_contacts ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes si elles existent
DROP POLICY IF EXISTS "Admins can view all user contacts" ON user_contacts;
DROP POLICY IF EXISTS "Admins can insert user contacts" ON user_contacts;
DROP POLICY IF EXISTS "Admins can delete user contacts" ON user_contacts;
DROP POLICY IF EXISTS "Users can view their own contacts" ON user_contacts;

-- Les admins peuvent voir toutes les relations
CREATE POLICY "Admins can view all user contacts" ON user_contacts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Les admins peuvent insérer des relations
CREATE POLICY "Admins can insert user contacts" ON user_contacts
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Les admins peuvent supprimer des relations
CREATE POLICY "Admins can delete user contacts" ON user_contacts
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Les utilisateurs peuvent voir leurs propres contacts autorisés
CREATE POLICY "Users can view their own contacts" ON user_contacts
    FOR SELECT USING (user_id = auth.uid());

-- Commentaires pour la documentation
COMMENT ON TABLE user_contacts IS 'Table pour stocker les contacts autorisés par intervenant (gestion admin)';
COMMENT ON FUNCTION add_user_contact IS 'Ajoute un contact autorisé pour un intervenant (admin seulement)';
COMMENT ON FUNCTION remove_user_contact IS 'Supprime un contact autorisé pour un intervenant (admin seulement)';
COMMENT ON FUNCTION get_user_contacts IS 'Récupère les contacts autorisés d''un utilisateur';
COMMENT ON FUNCTION get_user_contacts_count IS 'Récupère le nombre de contacts autorisés d''un utilisateur'; 