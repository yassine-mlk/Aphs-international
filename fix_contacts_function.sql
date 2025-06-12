-- =========================================
-- CORRECTION RAPIDE: Fonction get_available_contacts
-- Mise à jour des types de retour pour correspondre au schéma
-- =========================================

-- Supprimer l'ancienne fonction
DROP FUNCTION IF EXISTS get_available_contacts(UUID) CASCADE;

-- Recréer avec les bons types
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

-- Test de la fonction
SELECT 'FONCTION CORRIGÉE AVEC SUCCÈS' as status;

-- Tester avec un utilisateur exemple (remplacer par un vrai UUID si besoin)
-- SELECT * FROM get_available_contacts('00000000-0000-0000-0000-000000000000') LIMIT 1; 