-- Script minimal pour tester les fonctions de contact
-- À exécuter dans Supabase SQL Editor

-- 1. Créer la table si elle n'existe pas
CREATE TABLE IF NOT EXISTS user_contacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(user_id, contact_id)
);

-- 2. Supprimer les fonctions existantes si elles existent
DROP FUNCTION IF EXISTS get_user_contacts_count(UUID);
DROP FUNCTION IF EXISTS get_user_contacts(UUID);
DROP FUNCTION IF EXISTS add_user_contact(UUID, UUID, UUID);
DROP FUNCTION IF EXISTS remove_user_contact(UUID, UUID, UUID);

-- 3. Créer la fonction de comptage (plus simple)
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
    WHERE uc.user_id = p_user_id;
    
    RETURN contact_count;
END;
$$;

-- 4. Créer la fonction de récupération des contacts
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
        COALESCE(u.raw_user_meta_data->>'first_name', '') as contact_first_name,
        COALESCE(u.raw_user_meta_data->>'last_name', '') as contact_last_name,
        COALESCE(u.raw_user_meta_data->>'role', '') as contact_role,
        COALESCE(u.raw_user_meta_data->>'specialty', '') as contact_specialty
    FROM user_contacts uc
    JOIN auth.users u ON uc.contact_id = u.id
    WHERE uc.user_id = p_user_id
    ORDER BY u.raw_user_meta_data->>'first_name', u.raw_user_meta_data->>'last_name';
END;
$$;

-- 5. Créer les fonctions d'ajout et suppression
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

-- 6. Activer RLS
ALTER TABLE user_contacts ENABLE ROW LEVEL SECURITY;

-- 7. Supprimer les politiques existantes
DROP POLICY IF EXISTS "Admins can view all user contacts" ON user_contacts;
DROP POLICY IF EXISTS "Admins can insert user contacts" ON user_contacts;
DROP POLICY IF EXISTS "Admins can delete user contacts" ON user_contacts;
DROP POLICY IF EXISTS "Users can view their own contacts" ON user_contacts;

-- 8. Créer les politiques RLS
CREATE POLICY "Admins can view all user contacts" ON user_contacts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

CREATE POLICY "Admins can insert user contacts" ON user_contacts
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

CREATE POLICY "Admins can delete user contacts" ON user_contacts
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_user_meta_data->>'role' = 'admin'
        )
    );

CREATE POLICY "Users can view their own contacts" ON user_contacts
    FOR SELECT USING (user_id = auth.uid());

-- 9. Test de la fonction
-- SELECT get_user_contacts_count('00000000-0000-0000-0000-000000000000'); 