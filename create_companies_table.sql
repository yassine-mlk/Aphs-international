-- Script SQL direct pour créer la table companies
-- Basée sur les formulaires et hooks de la page entreprises existante
-- SANS RLS comme demandé

-- Supprimer la table si elle existe déjà
DROP TABLE IF EXISTS companies CASCADE;

-- Créer la table companies
CREATE TABLE companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    pays TEXT,
    secteur TEXT,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Commentaires sur les colonnes
COMMENT ON TABLE companies IS 'Table des entreprises - Basée sur les formulaires existants';
COMMENT ON COLUMN companies.id IS 'Identifiant unique de l''entreprise';
COMMENT ON COLUMN companies.name IS 'Nom de l''entreprise (obligatoire)';
COMMENT ON COLUMN companies.pays IS 'Pays de l''entreprise';
COMMENT ON COLUMN companies.secteur IS 'Secteur d''activité de l''entreprise';
COMMENT ON COLUMN companies.logo_url IS 'URL du logo de l''entreprise';
COMMENT ON COLUMN companies.created_at IS 'Date de création de l''enregistrement';
COMMENT ON COLUMN companies.updated_at IS 'Date de dernière mise à jour';

-- Créer des index pour améliorer les performances
CREATE INDEX idx_companies_name ON companies(name);
CREATE INDEX idx_companies_pays ON companies(pays);
CREATE INDEX idx_companies_secteur ON companies(secteur);
CREATE INDEX idx_companies_created_at ON companies(created_at);

-- Trigger pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_companies_updated_at 
    BEFORE UPDATE ON companies 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- AUCUNE POLITIQUE RLS (Row Level Security) COMME DEMANDÉ
-- La table sera accessible sans restrictions pour tous les utilisateurs

-- Données d'exemple (optionnel)
INSERT INTO companies (name, pays, secteur, logo_url) VALUES
('Tech Innovation', 'France', 'Technologie', NULL),
('Green Energy Corp', 'Espagne', 'Énergies renouvelables', NULL),
('Construction Plus', 'Maroc', 'Construction', NULL),
('Digital Solutions', 'Canada', 'Services numériques', NULL),
('Eco Transport', 'France', 'Transport', NULL);

-- Afficher le résultat
SELECT 'Table companies créée avec succès!' as message;
SELECT COUNT(*) as nombre_entreprises FROM companies; 