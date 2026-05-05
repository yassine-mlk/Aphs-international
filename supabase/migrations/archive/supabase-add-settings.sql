-- ============================================================================
-- AJOUTER LA COLONNE SETTINGS MANQUANTE
-- ============================================================================

-- Ajouter la colonne settings à la table tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- Vérifier
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tenants' AND column_name = 'settings';
