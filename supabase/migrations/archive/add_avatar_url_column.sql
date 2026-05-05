-- Ajouter la colonne avatar_url à la table user_settings
-- Cette colonne stockera l'URL de la photo de profil de l'utilisateur

-- Vérifier si la colonne existe déjà et l'ajouter si nécessaire
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_settings' 
        AND column_name = 'avatar_url'
    ) THEN
        ALTER TABLE user_settings 
        ADD COLUMN avatar_url TEXT;
        
        -- Ajouter un commentaire pour documenter la colonne
        COMMENT ON COLUMN user_settings.avatar_url IS 'URL de la photo de profil de l''utilisateur stockée dans Supabase Storage';
    END IF;
END $$; 