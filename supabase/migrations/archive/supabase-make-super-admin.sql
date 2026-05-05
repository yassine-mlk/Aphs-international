-- ============================================================================
-- SCRIPT : Définir l'admin actuel comme Super Admin
-- ============================================================================
-- À exécuter après avoir créé la migration SaaS
-- ============================================================================

-- Définir tous les admins existants comme super admin
-- Modifiez l'email si nécessaire pour cibler un utilisateur spécifique
UPDATE profiles 
SET is_super_admin = true 
WHERE role = 'admin' 
  AND email LIKE '%admin%';  -- Ajustez cette condition selon votre besoin

-- Ou cibler un email spécifique :
-- UPDATE profiles 
-- SET is_super_admin = true 
-- WHERE email = 'votre-email@exemple.com';

-- Vérification
SELECT 
    user_id,
    email,
    first_name,
    last_name,
    role,
    is_super_admin,
    tenant_id
FROM profiles 
WHERE is_super_admin = true;
