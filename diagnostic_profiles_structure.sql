-- =========================================
-- DIAGNOSTIC DE LA STRUCTURE DE LA TABLE PROFILES
-- À exécuter pour voir les colonnes disponibles
-- =========================================

-- 1. Voir toutes les colonnes de la table profiles
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. Voir un échantillon des données pour comprendre la structure
SELECT *
FROM profiles
LIMIT 3;

-- 3. Voir la définition complète de la table
SELECT 
    'Table: profiles' as info,
    'Columns found: ' || COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name = 'profiles'; 