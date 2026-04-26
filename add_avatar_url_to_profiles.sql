-- Add avatar_url column to profiles table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
        ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
        COMMENT ON COLUMN profiles.avatar_url IS 'URL de la photo de profil de l''utilisateur stockée dans Cloudflare R2';
    END IF;
END $$;
