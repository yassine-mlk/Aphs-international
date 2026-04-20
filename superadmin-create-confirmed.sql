-- =====================================================
-- SOLUTION SQL : Créer un admin avec email confirmé
-- À exécuter dans Supabase SQL Editor après création
-- =====================================================

-- Remplacez par l'email et le UUID de l'utilisateur créé
-- Vous trouvez l'UUID dans auth.users

DO $$
DECLARE
    user_uuid UUID := '27f2e412-5b6c-4aa9-ba91-142ac411789c'; -- REMPLACEZ
BEGIN
    -- Confirmer l'email de l'utilisateur
    UPDATE auth.users 
    SET email_confirmed_at = NOW(),
        updated_at = NOW()
    WHERE id = user_uuid;
    
    RAISE NOTICE 'Email confirmé pour l utilisateur %', user_uuid;
END $$;

-- Vérifier que ça a marché
SELECT id, email, email_confirmed_at, confirmed_at 
FROM auth.users 
WHERE id = '27f2e412-5b6c-4aa9-ba91-142ac411789c';
