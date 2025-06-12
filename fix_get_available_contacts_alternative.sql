-- =========================================
-- VERSION ALTERNATIVE - FONCTION get_available_contacts
-- À utiliser si la première version ne fonctionne pas
-- =========================================

-- Supprimer l'ancienne fonction
DROP FUNCTION IF EXISTS get_available_contacts(UUID);

-- Version qui correspond exactement aux types de la base de données
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
        p.user_id::UUID as contact_id,
        COALESCE(p.email, '')::VARCHAR(255) as contact_email,
        COALESCE(p.first_name, '')::VARCHAR(255) as contact_first_name,
        COALESCE(p.last_name, '')::VARCHAR(255) as contact_last_name,
        COALESCE(p.role, 'intervenant')::VARCHAR(50) as contact_role,
        COALESCE(p.specialty, '')::TEXT as contact_specialty
    FROM profiles p
    INNER JOIN workgroup_members wm1 ON p.user_id = wm1.user_id
    INNER JOIN workgroup_members wm2 ON wm1.workgroup_id = wm2.workgroup_id
    WHERE wm2.user_id = p_user_id
    AND p.user_id != p_user_id
    AND p.status = 'active'
    ORDER BY p.first_name, p.last_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Message de confirmation
SELECT '✅ Version alternative de get_available_contacts créée avec types VARCHAR' as message;

-- Vérifier que la fonction existe et voir son type de retour
SELECT 
    p.proname as function_name,
    pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.proname = 'get_available_contacts'; 