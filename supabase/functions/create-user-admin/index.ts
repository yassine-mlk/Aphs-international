import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.aps-construction.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Parse request body
    const { email, password, userData } = await req.json()

    console.log('🔄 Création utilisateur via Edge Function:', email)

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: userData
    })

    if (authError) {
      console.error('❌ Erreur création auth:', authError)
      throw authError
    }

    console.log('✅ Utilisateur auth créé:', authData.user?.id)

    // Create profile manually
    const profileData: Record<string, unknown> = {
      user_id: authData.user?.id,
      email: email,
      first_name: userData.first_name || '',
      last_name: userData.last_name || '',
      role: userData.role || 'intervenant',
      specialty: userData.specialty || '',
      company: userData.company || 'Indépendant',
      status: 'active'
    }

    // Ajouter tenant_id si fourni (pour les admins créés par le Super Admin)
    if (userData.tenant_id) {
      profileData.tenant_id = userData.tenant_id
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert(profileData)

    if (profileError) {
      console.warn('⚠️ Erreur profil (non bloquante):', profileError)
    } else {
      console.log('✅ Profil créé via Edge Function')
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: authData.user?.id,
        message: 'Utilisateur créé avec succès via Edge Function'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('❌ Erreur Edge Function:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        message: 'Erreur lors de la création via Edge Function'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
}) 