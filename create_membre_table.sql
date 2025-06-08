-- Script SQL pour créer la table membre sans politiques RLS
-- Cette table stocke les intervenants attachés à chaque projet
-- À exécuter dans l'éditeur SQL de Supabase

-- Créer la table membre
CREATE TABLE IF NOT EXISTS membre (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'membre',
  added_by UUID,
  added_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Contraintes
  CONSTRAINT unique_project_user UNIQUE (project_id, user_id)
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_membre_project_id ON membre(project_id);
CREATE INDEX IF NOT EXISTS idx_membre_user_id ON membre(user_id);
CREATE INDEX IF NOT EXISTS idx_membre_added_by ON membre(added_by);

-- Trigger pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_membre_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_membre_updated_at 
    BEFORE UPDATE ON membre 
    FOR EACH ROW EXECUTE FUNCTION update_membre_updated_at();

-- Commentaires pour la documentation
COMMENT ON TABLE membre IS 'Table des membres de projet - stocke les intervenants attachés à chaque projet, créée SANS politiques RLS';
COMMENT ON COLUMN membre.id IS 'Identifiant unique du membre';
COMMENT ON COLUMN membre.project_id IS 'Référence vers la table projects';
COMMENT ON COLUMN membre.user_id IS 'UUID de l''utilisateur (intervenant)';
COMMENT ON COLUMN membre.role IS 'Rôle du membre dans le projet (membre, responsable, etc.)';
COMMENT ON COLUMN membre.added_by IS 'UUID de l''utilisateur qui a ajouté ce membre';
COMMENT ON COLUMN membre.added_at IS 'Date d''ajout du membre au projet';
COMMENT ON COLUMN membre.updated_at IS 'Date de dernière modification'; 