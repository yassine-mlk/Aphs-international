-- ============================================================================
-- VÉRIFICATION ET RÉCUPÉRATION DES UTILISATEURS EXISTANTS
-- ============================================================================

-- 1. Voir tous les utilisateurs dans auth.users
SELECT id, email, created_at, last_sign_in_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 20;

-- 2. Voir tous les profils dans la table profiles
SELECT user_id, email, first_name, last_name, role, tenant_id, is_super_admin
FROM profiles
ORDER BY created_at DESC
LIMIT 20;

-- 3. Voir tous les tenants créés
SELECT id, name, slug, owner_email, owner_user_id, plan, status
FROM tenants
ORDER BY created_at DESC;

-- 4. Voir les membres de tenants
SELECT tm.*, t.name as tenant_name, p.email
FROM tenant_members tm
JOIN tenants t ON tm.tenant_id = t.id
JOIN profiles p ON tm.user_id = p.user_id;

-- 5. Utilisateurs sans tenant (orphelins)
SELECT u.id, u.email, p.role
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.user_id
WHERE p.tenant_id IS NULL OR p.tenant_id = '';

-- 6. Super admins
SELECT p.user_id, p.email, p.first_name, p.last_name
FROM profiles p
WHERE p.is_super_admin = true;
