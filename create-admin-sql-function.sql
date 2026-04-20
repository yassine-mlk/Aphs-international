-- =====================================================
-- FONCTION SQL : Créer un admin avec email auto-confirmé
-- Colle ce script dans Supabase SQL Editor et exécute
-- =====================================================

-- Activer pgcrypto si pas encore fait
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION create_tenant_admin_user(
  p_email TEXT,
  p_password TEXT,
  p_first_name TEXT,
  p_last_name TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER  -- s'exécute avec les droits superuser
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id UUID;
  v_encrypted_password TEXT;
BEGIN
  -- Générer un UUID pour le nouvel utilisateur
  v_user_id := gen_random_uuid();
  
  -- Hasher le mot de passe (Supabase utilise bcrypt via pgcrypto)
  v_encrypted_password := extensions.crypt(p_password, extensions.gen_salt('bf'));

  -- Insérer directement dans auth.users avec email confirmé
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_user_meta_data,
    raw_app_meta_data,
    role,
    aud
  ) VALUES (
    v_user_id,
    p_email,
    v_encrypted_password,
    NOW(),  -- email confirmé immédiatement
    NOW(),
    NOW(),
    jsonb_build_object(
      'first_name', p_first_name,
      'last_name', p_last_name,
      'role', 'admin'
    ),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
    'authenticated',
    'authenticated'
  );

  RETURN json_build_object(
    'success', true,
    'userId', v_user_id::text,
    'email', p_email
  );

EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cet email est déjà utilisé'
    );
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Donner l'accès à la fonction (service_role l'appelle)
GRANT EXECUTE ON FUNCTION create_tenant_admin_user TO service_role;
GRANT EXECUTE ON FUNCTION create_tenant_admin_user TO authenticated;

-- =====================================================
-- TEST : Créer un admin de test (optionnel)
-- =====================================================
-- SELECT create_tenant_admin_user(
--   'test-admin@exemple.com',
--   'MotDePasse123',
--   'Jean',
--   'Dupont'
-- );
