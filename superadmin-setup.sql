-- =====================================================
-- SCRIPT: Créer ou mettre à jour un Super Admin
-- =====================================================

-- REMPLACEZ 'ymalki33@gmail.com' par l'email voulu
-- Et exécutez dans Supabase SQL Editor

-- Option 1: Mettre à jour un utilisateur EXISTANT
UPDATE profiles 
SET is_super_admin = true 
WHERE email = 'ymalki33@gmail.com';

-- Vérifier que ça a marché
SELECT user_id, email, is_super_admin, role 
FROM profiles 
WHERE email = 'ymalki33@gmail.com';

-- =====================================================
-- Option 2: Créer un NOUVEAU Super Admin (si pas de profil)
-- Remplacez l'UUID par celui de auth.users
-- =====================================================
/*
INSERT INTO profiles (user_id, email, first_name, last_name, role, is_super_admin, status)
VALUES (
    '27f2e412-5b6c-4aa9-ba91-142ac411789c',  -- UUID de auth.users
    'ymalki33@gmail.com',
    'Super',
    'Admin',
    'admin',
    true,  -- ← IMPORTANT: true pour Super Admin
    'active'
)
ON CONFLICT (user_id) DO UPDATE SET is_super_admin = true;
*/
