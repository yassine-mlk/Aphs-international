-- =========================================
-- VÉRIFICATION DU SCHÉMA DE LA TABLE PROFILES
-- À exécuter dans Supabase Dashboard
-- =========================================

-- Vérifier les types de colonnes dans la table profiles
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Vérifier spécifiquement les colonnes utilisées dans get_available_contacts
SELECT 
    'email' as column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
AND column_name = 'email'

UNION ALL

SELECT 
    'first_name' as column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
AND column_name = 'first_name'

UNION ALL

SELECT 
    'last_name' as column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
AND column_name = 'last_name'

UNION ALL

SELECT 
    'role' as column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
AND column_name = 'role'

UNION ALL

SELECT 
    'specialty' as column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
AND column_name = 'specialty';

-- Vérifier la définition actuelle de la fonction get_available_contacts
SELECT 
    p.proname as function_name,
    pg_get_function_result(p.oid) as return_type,
    pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.proname = 'get_available_contacts'; 