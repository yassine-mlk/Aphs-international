-- Ajouter les colonnes theme et language à la table profiles si elles n'existent pas

-- Vérifier et ajouter la colonne theme
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'theme'
    ) THEN
        ALTER TABLE profiles ADD COLUMN theme VARCHAR(10) DEFAULT 'light';
        COMMENT ON COLUMN profiles.theme IS 'Thème de l utilisateur (light/dark)';
    END IF;
END $$;

-- Vérifier et ajouter la colonne language
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'language'
    ) THEN
        ALTER TABLE profiles ADD COLUMN language VARCHAR(5) DEFAULT 'fr';
        COMMENT ON COLUMN profiles.language IS 'Langue préférée de l utilisateur';
    END IF;
END $$;

-- Vérifier et ajouter les colonnes de notification si elles n'existent pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'email_notifications'
    ) THEN
        ALTER TABLE profiles ADD COLUMN email_notifications BOOLEAN DEFAULT true;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'push_notifications'
    ) THEN
        ALTER TABLE profiles ADD COLUMN push_notifications BOOLEAN DEFAULT true;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'message_notifications'
    ) THEN
        ALTER TABLE profiles ADD COLUMN message_notifications BOOLEAN DEFAULT false;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'update_notifications'
    ) THEN
        ALTER TABLE profiles ADD COLUMN update_notifications BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Mettre à jour les enregistrements existants avec les valeurs par défaut
UPDATE profiles SET theme = COALESCE(theme, 'light') WHERE theme IS NULL;
UPDATE profiles SET language = COALESCE(language, 'fr') WHERE language IS NULL;
UPDATE profiles SET email_notifications = COALESCE(email_notifications, true) WHERE email_notifications IS NULL;
UPDATE profiles SET push_notifications = COALESCE(push_notifications, true) WHERE push_notifications IS NULL;
UPDATE profiles SET message_notifications = COALESCE(message_notifications, false) WHERE message_notifications IS NULL;
UPDATE profiles SET update_notifications = COALESCE(update_notifications, true) WHERE update_notifications IS NULL;

-- Vérification
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('theme', 'language', 'email_notifications', 'push_notifications', 'message_notifications', 'update_notifications')
ORDER BY column_name;
