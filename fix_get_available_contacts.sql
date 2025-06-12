-- =========================================
-- CORRECTION DE LA FONCTION get_available_contacts
-- À exécuter dans Supabase Dashboard
-- =========================================

-- Supprimer l'ancienne fonction
DROP FUNCTION IF EXISTS get_available_contacts(UUID);

-- Recréer la fonction avec les types corrects (TEXT au lieu de VARCHAR)
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
        p.email as contact_email,
        p.first_name as contact_first_name,
        p.last_name as contact_last_name,
        p.role as contact_role,
        p.specialty as contact_specialty
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
SELECT '✅ Fonction get_available_contacts corrigée avec les types TEXT' as message; 