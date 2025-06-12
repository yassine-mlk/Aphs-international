-- =========================================
-- CORRECTION COMPLÈTE DE LA FONCTION get_available_contacts
-- À exécuter dans Supabase Dashboard
-- =========================================

-- Supprimer l'ancienne fonction
DROP FUNCTION IF EXISTS get_available_contacts(UUID);

-- Option 1: Recréer la fonction avec casting explicite vers TEXT
CREATE OR REPLACE FUNCTION get_available_contacts(p_user_id UUID)
RETURNS TABLE (
    contact_id UUID,
    contact_email TEXT,
    contact_first_name TEXT,
    contact_last_name TEXT,
    contact_role TEXT,
    contact_specialty TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        p.user_id as contact_id,
        p.email::TEXT as contact_email,
        p.first_name::TEXT as contact_first_name,
        p.last_name::TEXT as contact_last_name,
        p.role::TEXT as contact_role,
        COALESCE(p.specialty, '')::TEXT as contact_specialty
    FROM profiles p
    INNER JOIN workgroup_members wm1 ON p.user_id = wm1.user_id
    INNER JOIN workgroup_members wm2 ON wm1.workgroup_id = wm2.workgroup_id
    WHERE wm2.user_id = p_user_id
    AND p.user_id != p_user_id
    AND p.status = 'active'
    ORDER BY p.first_name::TEXT, p.last_name::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Alternative Option 2: Fonction avec types VARCHAR pour correspondre exactement à la DB
-- (Décommentez si l'option 1 ne fonctionne pas)
/*
CREATE OR REPLACE FUNCTION get_available_contacts(p_user_id UUID)
RETURNS TABLE (
    contact_id UUID,
    contact_email VARCHAR(255),
    contact_first_name VARCHAR(255),
    contact_last_name VARCHAR(255),
    contact_role VARCHAR(50),
    contact_specialty TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        p.user_id as contact_id,
        p.email as contact_email,
        p.first_name as contact_first_name,
        p.last_name as contact_last_name,
        p.role as contact_role,
        COALESCE(p.specialty, '') as contact_specialty
    FROM profiles p
    INNER JOIN workgroup_members wm1 ON p.user_id = wm1.user_id
    INNER JOIN workgroup_members wm2 ON wm1.workgroup_id = wm2.workgroup_id
    WHERE wm2.user_id = p_user_id
    AND p.user_id != p_user_id
    AND p.status = 'active'
    ORDER BY p.first_name, p.last_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
*/

-- Test de la fonction
SELECT '✅ Fonction get_available_contacts recréée avec casting vers TEXT' as message;

-- Test rapide (remplacez par un UUID valide d'utilisateur)
-- SELECT * FROM get_available_contacts('00000000-0000-0000-0000-000000000000');

-- Vérifier que la fonction existe bien
SELECT 
    p.proname as function_name,
    pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.proname = 'get_available_contacts'; 