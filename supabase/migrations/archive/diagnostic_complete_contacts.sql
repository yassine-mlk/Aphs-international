-- =========================================
-- DIAGNOSTIC COMPLET POUR get_available_contacts
-- À exécuter dans Supabase Dashboard
-- =========================================

-- 1. Vérifier le schéma de la table profiles
SELECT 
    '=== SCHÉMA TABLE PROFILES ===' as step,
    column_name,
    data_type,
    character_maximum_length,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
AND column_name IN ('user_id', 'email', 'first_name', 'last_name', 'role', 'specialty')
ORDER BY ordinal_position;

-- 2. Vérifier si les tables workgroup_members et workgroups existent
SELECT 
    '=== TABLES WORKGROUPS ===' as step,
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('workgroups', 'workgroup_members');

-- 3. Vérifier la définition actuelle de la fonction
SELECT 
    '=== FONCTION ACTUELLE ===' as step,
    p.proname as function_name,
    pg_get_function_result(p.oid) as return_type,
    pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.proname = 'get_available_contacts';

-- 4. Compter les données dans les tables
SELECT 
    '=== COMPTAGE DONNÉES ===' as step,
    'profiles' as table_name,
    COUNT(*) as count
FROM profiles
WHERE status = 'active'

UNION ALL

SELECT 
    '=== COMPTAGE DONNÉES ===' as step,
    'workgroup_members' as table_name,
    COUNT(*) as count
FROM workgroup_members

UNION ALL

SELECT 
    '=== COMPTAGE DONNÉES ===' as step,
    'workgroups' as table_name,
    COUNT(*) as count
FROM workgroups;

-- 5. Vérifier s'il y a des données de test
SELECT 
    '=== ÉCHANTILLON PROFILES ===' as step,
    user_id,
    email,
    first_name,
    last_name,
    role,
    status
FROM profiles 
WHERE status = 'active'
LIMIT 3;

-- 6. Vérifier s'il y a des workgroup_members
SELECT 
    '=== ÉCHANTILLON WORKGROUP_MEMBERS ===' as step,
    workgroup_id,
    user_id
FROM workgroup_members 
LIMIT 3;

-- 7. Supprimer l'ancienne fonction et créer la nouvelle version robuste
DROP FUNCTION IF EXISTS get_available_contacts(UUID);

-- 8. Créer la fonction finale avec gestion d'erreurs et types adaptés
CREATE OR REPLACE FUNCTION get_available_contacts(p_user_id UUID)
RETURNS TABLE (
    contact_id UUID,
    contact_email TEXT,
    contact_first_name TEXT,
    contact_last_name TEXT,
    contact_role TEXT,
    contact_specialty TEXT
) AS $$
DECLARE
    profile_count INTEGER;
    workgroup_count INTEGER;
BEGIN
    -- Vérifier si l'utilisateur existe
    SELECT COUNT(*) INTO profile_count
    FROM profiles 
    WHERE user_id = p_user_id AND status = 'active';
    
    IF profile_count = 0 THEN
        RAISE NOTICE 'Utilisateur % non trouvé ou inactif', p_user_id;
        RETURN;
    END IF;
    
    -- Vérifier si l'utilisateur est dans des workgroups
    SELECT COUNT(*) INTO workgroup_count
    FROM workgroup_members 
    WHERE user_id = p_user_id;
    
    IF workgroup_count = 0 THEN
        RAISE NOTICE 'Utilisateur % ne fait partie d''aucun workgroup', p_user_id;
        RETURN;
    END IF;
    
    -- Retourner les contacts avec casting explicite
    RETURN QUERY
    SELECT DISTINCT
        p.user_id as contact_id,
        COALESCE(p.email, '')::TEXT as contact_email,
        COALESCE(p.first_name, '')::TEXT as contact_first_name,
        COALESCE(p.last_name, '')::TEXT as contact_last_name,
        COALESCE(p.role, 'intervenant')::TEXT as contact_role,
        COALESCE(p.specialty, '')::TEXT as contact_specialty
    FROM profiles p
    INNER JOIN workgroup_members wm1 ON p.user_id = wm1.user_id
    INNER JOIN workgroup_members wm2 ON wm1.workgroup_id = wm2.workgroup_id
    WHERE wm2.user_id = p_user_id
    AND p.user_id != p_user_id
    AND p.status = 'active'
    ORDER BY COALESCE(p.first_name, '')::TEXT, COALESCE(p.last_name, '')::TEXT;
    
    RAISE NOTICE 'Fonction get_available_contacts exécutée avec succès pour utilisateur %', p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Message de confirmation
SELECT '✅ Fonction get_available_contacts recréée avec diagnostic complet' as message;

-- 10. Vérifier la nouvelle fonction
SELECT 
    '=== NOUVELLE FONCTION ===' as step,
    p.proname as function_name,
    pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.proname = 'get_available_contacts'; 