-- Système de contacts ultra-simple
-- Une table, une fonction, c'est tout

-- 1. Table simple
DROP TABLE IF EXISTS user_contacts CASCADE;
CREATE TABLE user_contacts (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, contact_id)
);

-- 2. Fonction simple pour récupérer les contacts d'un utilisateur
CREATE OR REPLACE FUNCTION get_user_contacts(user_id UUID)
RETURNS TABLE(contact_id UUID) 
LANGUAGE sql SECURITY DEFINER AS $$
    SELECT contact_id FROM user_contacts WHERE user_id = $1;
$$;

-- 3. Fonction simple pour ajouter un contact
CREATE OR REPLACE FUNCTION add_contact(user_id UUID, contact_id UUID)
RETURNS BOOLEAN 
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO user_contacts (user_id, contact_id) 
    VALUES ($1, $2) 
    ON CONFLICT DO NOTHING;
    RETURN TRUE;
END;
$$;

-- 4. Fonction simple pour supprimer un contact
CREATE OR REPLACE FUNCTION remove_contact(user_id UUID, contact_id UUID)
RETURNS BOOLEAN 
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    DELETE FROM user_contacts WHERE user_id = $1 AND contact_id = $2;
    RETURN TRUE;
END;
$$;

-- 5. RLS simple
ALTER TABLE user_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON user_contacts FOR ALL USING (true); 