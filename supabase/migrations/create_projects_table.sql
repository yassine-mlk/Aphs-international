-- Création de la table projects sans politiques RLS
-- Basée sur les types définis dans src/types/project.ts et les formulaires

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

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_projects_company_id ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_start_date ON projects(start_date);

-- Trigger pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_projects_updated_at 
    BEFORE UPDATE ON projects 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Commentaires pour la documentation
COMMENT ON TABLE projects IS 'Table des projets - créée sans politiques RLS';
COMMENT ON COLUMN projects.id IS 'Identifiant unique du projet';
COMMENT ON COLUMN projects.name IS 'Nom du projet (obligatoire)';
COMMENT ON COLUMN projects.description IS 'Description du projet (obligatoire)';
COMMENT ON COLUMN projects.start_date IS 'Date de début du projet (obligatoire)';
COMMENT ON COLUMN projects.end_date IS 'Date de fin du projet (optionnelle)';
COMMENT ON COLUMN projects.image_url IS 'URL de l''image du projet stockée dans le bucket';
COMMENT ON COLUMN projects.company_id IS 'Référence vers la table companies';
COMMENT ON COLUMN projects.status IS 'Statut du projet: active, completed, paused, cancelled';
COMMENT ON COLUMN projects.created_by IS 'UUID de l''utilisateur qui a créé le projet';
COMMENT ON COLUMN projects.created_at IS 'Date de création';
COMMENT ON COLUMN projects.updated_at IS 'Date de dernière modification'; 