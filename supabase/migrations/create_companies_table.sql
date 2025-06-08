-- Migration pour créer la table companies
-- Basée sur les formulaires et hooks existants

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
-- La table sera accessible sans restrictions 