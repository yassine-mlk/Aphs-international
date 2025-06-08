-- Script SQL pour créer la table profiles
-- À exécuter dans l'éditeur SQL de Supabase
-- IMPORTANT: Cette table est créée SANS politiques RLS comme demandé

-- 1. Créer la table profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE, -- Référence vers auth.users, peut être NULL pour les profils créés indépendamment
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'intervenant' CHECK (role IN ('admin', 'intervenant', 'owner')),
  specialty TEXT,
  company TEXT DEFAULT 'Indépendant',
  company_id UUID, -- Référence vers la table companies
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  bio TEXT,
  theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
  language TEXT DEFAULT 'fr' CHECK (language IN ('fr', 'en', 'es', 'ar')),
  -- Notifications preferences
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  message_notifications BOOLEAN DEFAULT true,
  update_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Créer les index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_specialty ON profiles(specialty);
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_name ON profiles USING gin(to_tsvector('french', name));

-- 3. Créer la fonction pour mettre à jour updated_at automatiquement (si elle n'existe pas déjà)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. Créer le trigger pour updated_at
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Contrainte pour vérifier que la spécialité est valide (optionnel)
ALTER TABLE profiles ADD CONSTRAINT valid_specialty CHECK (
  specialty IS NULL OR specialty IN (
    'MOA Maître d''ouvrage',
    'AMO Assistant maîtrise d''ouvrage',
    'Géomètre',
    'MOE Maître d''oeuvre',
    'Commission de sécurité',
    'Monuments historiques',
    'Elus locaux',
    'Futurs usagers',
    'Gestionnaire',
    'Programmiste',
    'Architectes',
    'Membres du Jury',
    'Bureau de contrôle',
    'Bureau d''étude de sol',
    'Bureau d''étude structure',
    'Bureau d''étude thermique',
    'Bureau d''étude acoustique',
    'Bureau d''étude électricité',
    'Bureau d''étude plomberie, chauffage, ventilation, climatisation',
    'Bureau d''étude VRD voirie, réseaux divers',
    'Architecte d''intérieur',
    'COORDINATEUR OPC',
    'COORDINATEUR SPS',
    'COORDINATEUR SSI'
  )
);

-- 6. Commentaires pour la documentation
COMMENT ON TABLE profiles IS 'Table des profils utilisateurs - créée SANS politiques RLS comme demandé';
COMMENT ON COLUMN profiles.id IS 'Identifiant unique du profil (UUID)';
COMMENT ON COLUMN profiles.user_id IS 'Référence vers auth.users (peut être NULL)';
COMMENT ON COLUMN profiles.first_name IS 'Prénom de l''utilisateur (obligatoire)';
COMMENT ON COLUMN profiles.last_name IS 'Nom de famille de l''utilisateur (obligatoire)';
COMMENT ON COLUMN profiles.name IS 'Nom complet généré automatiquement';
COMMENT ON COLUMN profiles.email IS 'Adresse email unique (obligatoire)';
COMMENT ON COLUMN profiles.phone IS 'Numéro de téléphone (optionnel)';
COMMENT ON COLUMN profiles.role IS 'Rôle: admin, intervenant, owner';
COMMENT ON COLUMN profiles.specialty IS 'Spécialité professionnelle';
COMMENT ON COLUMN profiles.company IS 'Nom de l''entreprise';
COMMENT ON COLUMN profiles.company_id IS 'Référence vers la table companies';
COMMENT ON COLUMN profiles.status IS 'Statut: active, inactive';
COMMENT ON COLUMN profiles.bio IS 'Biographie/description personnelle';
COMMENT ON COLUMN profiles.theme IS 'Thème préféré: light, dark';
COMMENT ON COLUMN profiles.language IS 'Langue préférée: fr, en, es, ar';
COMMENT ON COLUMN profiles.email_notifications IS 'Notifications par email activées';
COMMENT ON COLUMN profiles.push_notifications IS 'Notifications push activées';
COMMENT ON COLUMN profiles.message_notifications IS 'Notifications de messages activées';
COMMENT ON COLUMN profiles.update_notifications IS 'Notifications de mise à jour activées';
COMMENT ON COLUMN profiles.created_at IS 'Date de création';
COMMENT ON COLUMN profiles.updated_at IS 'Date de dernière modification';

-- 7. Insertion de données de test (optionnel - décommentez si vous voulez des exemples)
/*
INSERT INTO profiles (first_name, last_name, email, role, specialty, company) VALUES
('Jean', 'Dupont', 'jean.dupont@exemple.fr', 'intervenant', 'Architectes', 'Indépendant'),
('Marie', 'Martin', 'marie.martin@exemple.fr', 'owner', 'MOA Maître d''ouvrage', 'Mairie de Test'),
('Pierre', 'Durand', 'pierre.durand@exemple.fr', 'intervenant', 'Bureau d''étude structure', 'BET Durand & Co');
*/

-- Vérification finale
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position; 