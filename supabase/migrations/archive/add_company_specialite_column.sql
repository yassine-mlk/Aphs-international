-- Script pour ajouter la colonne spécialité aux entreprises
-- Objectif: Permettre de spécifier la spécialité BTP de chaque entreprise

-- Vérifier si la table companies existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies') THEN
        -- Créer la table companies si elle n'existe pas
        CREATE TABLE companies (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            name TEXT NOT NULL,
            pays TEXT,
            secteur TEXT,
            specialite TEXT,
            logo_url TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Créer un index sur le nom pour les recherches
        CREATE INDEX idx_companies_name ON companies(name);
        
        -- Créer un index sur la spécialité pour les filtres
        CREATE INDEX idx_companies_specialite ON companies(specialite);
        
        RAISE NOTICE 'Table companies créée avec la colonne specialite';
    ELSE
        -- La table existe, vérifier si la colonne specialite existe
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'companies' AND column_name = 'specialite') THEN
            -- Ajouter la colonne specialite
            ALTER TABLE companies ADD COLUMN specialite TEXT;
            
            -- Créer un index sur la spécialité pour les filtres
            CREATE INDEX idx_companies_specialite ON companies(specialite);
            
            RAISE NOTICE 'Colonne specialite ajoutée à la table companies';
        ELSE
            RAISE NOTICE 'La colonne specialite existe déjà dans la table companies';
        END IF;
    END IF;
END $$;

-- Créer ou mettre à jour la fonction pour gérer updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Créer le trigger pour mettre à jour automatiquement updated_at
DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Ajouter une contrainte pour valider les spécialités (optionnel)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints 
                   WHERE constraint_name = 'companies_specialite_check') THEN
        ALTER TABLE companies ADD CONSTRAINT companies_specialite_check 
        CHECK (specialite IS NULL OR specialite IN (
            'Entreprise fondation',
            'Entreprise Gros-Œuvre',
            'Entreprise VRD voirie-réseaux divers',
            'Entreprise Charpente/Couverture/Étanchéité',
            'Entreprise Menuiseries extérieures',
            'Entreprise Menuiseries intérieures',
            'Entreprise Électricité',
            'Entreprise Plomberie/Chauffage/Ventilation/Climatisation',
            'Entreprise Cloison/Doublage',
            'Entreprise Revêtement de sol',
            'Entreprise Métallerie/Serrurerie',
            'Entreprise Peinture',
            'Entreprise Ascenseur',
            'Entreprise Agencement',
            'Entreprise Paysage/Espace vert',
            'Fournisseurs indirects',
            'Services extérieurs'
        ));
        
        RAISE NOTICE 'Contrainte de validation des spécialités ajoutée';
    ELSE
        RAISE NOTICE 'La contrainte de validation des spécialités existe déjà';
    END IF;
END $$;

-- Configurer les politiques RLS (Row Level Security) si nécessaire
DO $$
BEGIN
    -- Vérifier si RLS est activé
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'companies' AND rowsecurity = true) THEN
        -- Politique pour permettre la lecture à tous les utilisateurs authentifiés
        DROP POLICY IF EXISTS "Permettre lecture des entreprises" ON companies;
        CREATE POLICY "Permettre lecture des entreprises" ON companies
            FOR SELECT USING (auth.role() = 'authenticated');
        
        -- Politique pour permettre l'insertion/modification aux admins
        DROP POLICY IF EXISTS "Permettre modification des entreprises aux admins" ON companies;
        CREATE POLICY "Permettre modification des entreprises aux admins" ON companies
            FOR ALL USING (
                auth.jwt() ->> 'role' = 'admin' OR
                (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
            );
        
        RAISE NOTICE 'Politiques RLS configurées pour la table companies';
    END IF;
END $$;

-- Afficher un résumé
DO $$
DECLARE
    company_count INTEGER;
    specialite_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO company_count FROM companies;
    SELECT COUNT(*) INTO specialite_count FROM companies WHERE specialite IS NOT NULL;
    
    RAISE NOTICE '=== RÉSUMÉ ===';
    RAISE NOTICE 'Total entreprises: %', company_count;
    RAISE NOTICE 'Entreprises avec spécialité: %', specialite_count;
    RAISE NOTICE 'Migration terminée avec succès!';
END $$; 