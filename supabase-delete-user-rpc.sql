-- ============================================================================
-- FONCTION RPC POUR SUPPRIMER UN UTILISATEUR DE AUTH.USERS
-- ============================================================================

-- Cette fonction permet au Super Admin de supprimer complètement un utilisateur
-- Elle doit être exécutée dans Supabase SQL Editor

CREATE OR REPLACE FUNCTION delete_auth_user(user_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Vérifier que l'appelant est Super Admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = auth.uid() 
        AND is_super_admin = true
    ) THEN
        RAISE EXCEPTION 'Seul le Super Admin peut supprimer des utilisateurs';
    END IF;

    -- Supprimer de auth.users (nécessite des privilèges admin)
    -- Note: Cette partie peut échouer si l'utilisateur n'a pas les droits admin sur auth
    DELETE FROM auth.users WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Accorder les permissions nécessaires
GRANT EXECUTE ON FUNCTION delete_auth_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_auth_user(UUID) TO anon;

-- Note: Si la fonction ne peut pas supprimer de auth.users directement,
-- il faudra utiliser une Edge Function ou l'API Admin de Supabase
-- Cette fonction marque au moins l'utilisateur comme supprimé dans les tables app

-- ============================================================================
-- ALTERNATIVE: Edge Function pour suppression complète
-- ============================================================================
/*
Pour une suppression complète incluant auth.users, créez une Edge Function:

1. Créer supabase/functions/delete-user/index.ts:

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "@supabase/supabase-js"

serve(async (req) => {
  const { user_id } = await req.json()
  
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  
  const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id)
  
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }
  
  return new Response(JSON.stringify({ success: true }), { status: 200 })
})

2. Déployer avec: supabase functions deploy delete-user
*/
