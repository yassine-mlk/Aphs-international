-- Script SQL pour créer la table projects
-- À exécuter dans l'éditeur SQL de Supabase
-- IMPORTANT: Cette table est créée SANS politiques RLS comme demandé

-- 1. Créer la table projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  image_url TEXT,
  company_id UUID,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Créer les index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_projects_company_id ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_start_date ON projects(start_date);
CREATE INDEX IF NOT EXISTS idx_projects_name ON projects USING gin(to_tsvector('french', name));
CREATE INDEX IF NOT EXISTS idx_projects_description ON projects USING gin(to_tsvector('french', description));

-- 3. Créer la fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. Créer le trigger pour updated_at
CREATE TRIGGER update_projects_updated_at 
    BEFORE UPDATE ON projects 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Commentaires pour la documentation
COMMENT ON TABLE projects IS 'Table des projets - créée SANS politiques RLS comme demandé';
COMMENT ON COLUMN projects.id IS 'Identifiant unique du projet (UUID)';
COMMENT ON COLUMN projects.name IS 'Nom du projet (obligatoire)';
COMMENT ON COLUMN projects.description IS 'Description détaillée du projet (obligatoire)';
COMMENT ON COLUMN projects.start_date IS 'Date de début du projet (obligatoire)';
COMMENT ON COLUMN projects.end_date IS 'Date de fin prévue du projet (optionnelle)';
COMMENT ON COLUMN projects.image_url IS 'URL de l''image du projet dans le bucket Supabase';
COMMENT ON COLUMN projects.company_id IS 'ID de l''entreprise associée au projet (optionnel)';
COMMENT ON COLUMN projects.status IS 'Statut actuel: active, completed, paused, cancelled';
COMMENT ON COLUMN projects.created_by IS 'UUID de l''utilisateur créateur du projet';
COMMENT ON COLUMN projects.created_at IS 'Timestamp de création automatique';
COMMENT ON COLUMN projects.updated_at IS 'Timestamp de dernière modification (auto-updated)';

-- 6. Insertion de données de test (optionnel - décommentez si vous voulez des exemples)
/*
INSERT INTO projects (name, description, start_date, status, created_by) VALUES
('Projet exemple 1', 'Description du premier projet de test', '2024-01-15', 'active', gen_random_uuid()),
('Projet exemple 2', 'Description du deuxième projet de test', '2024-02-01', 'active', gen_random_uuid()),
('Projet terminé', 'Un projet qui a été terminé', '2023-12-01', 'completed', gen_random_uuid());
*/

-- Vérification finale
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'projects' 
ORDER BY ordinal_position; 