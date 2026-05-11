import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, corsHeaders } from '../_shared/cors.ts';



// DEPRECATED: use getCorsHeaders(req) instead
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.aps-construction.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) })
  }

  try {
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

    // Verify caller's JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Aucun token d\'authentification fourni' }),
        { status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: verifyError } = await supabaseAdmin.auth.getUser(token)

    if (verifyError || !caller) {
      return new Response(
        JSON.stringify({ error: 'Token invalide' }),
        { status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    // Verify caller is super admin
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('is_super_admin')
      .eq('user_id', caller.id)
      .maybeSingle()

    if (!callerProfile?.is_super_admin) {
      return new Response(
        JSON.stringify({ error: 'Droits super administrateur requis' }),
        { status: 403, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

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

    const userId = authData.user!.id

    // Create profile
    const profileData: Record<string, unknown> = {
      user_id: userId,
      email: email,
      first_name: userData.first_name || '',
      last_name: userData.last_name || '',
      role: userData.role || 'intervenant',
      specialty: userData.specialty || '',
      company: userData.company || 'Indépendant',
      status: 'active'
    }

    if (userData.tenant_id) {
      profileData.tenant_id = userData.tenant_id
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert(profileData, { onConflict: 'user_id' })

    if (profileError) {
      console.warn('⚠️ Erreur profil:', profileError)
    } else {
      console.log('✅ Profil créé')
    }

    // Create tenant_members entry if tenant_id provided
    if (userData.tenant_id) {
      await supabaseAdmin
        .from('tenant_members')
        .upsert({
          user_id: userId,
          tenant_id: userData.tenant_id,
          role: userData.role || 'intervenant',
          status: 'active',
          invited_by: caller.id,
          joined_at: new Date().toISOString()
        }, { onConflict: 'tenant_id,user_id' })
        .catch(err => console.error('Erreur création membership:', err.message))
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId: userId,
        message: 'Utilisateur créé avec succès via Edge Function'
      }),
      {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
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
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
