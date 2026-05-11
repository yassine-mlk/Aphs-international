import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) })
  }

  // Créer un client Supabase avec la clé SERVICE_ROLE (ne jamais exposer cette clé au frontend)
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

  // Vérifier le token d'authentification
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: 'Aucun token d\'authentification fourni' }),
      { status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    )
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: verifyError } = await supabaseAdmin.auth.getUser(token)

  if (verifyError || !user) {
    return new Response(
      JSON.stringify({ error: 'Token invalide' }),
      { status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    )
  }

  // Vérifier que l'utilisateur est un admin
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  const isAdmin = user.user_metadata?.role === 'admin' || profile?.role === 'admin'

  if (!isAdmin) {
    return new Response(
      JSON.stringify({ error: 'Droits administrateur requis' }),
      { status: 403, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    )
  }

  // Récupérer le corps de la requête
  const { action, ...data } = await req.json()

  // Traiter différentes actions
  try {
    if (action === 'listUsers') {
      const { data: users, error } = await supabaseAdmin.auth.admin.listUsers()
      
      if (error) throw error
      
      return new Response(
        JSON.stringify({ users }),
        { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    } 
    else if (action === 'createUser') {
      const { email, password, role, additionalData } = data
      
      const { data: userData, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { 
          role, 
          ...additionalData 
        },
      })
      
      if (error) throw error
      
      if (userData && userData.user) {
        const userId = userData.user.id
        const tenantId = additionalData?.tenant_id

        // Création du profil utilisateur
        try {
          await supabaseAdmin
            .from('profiles')
            .upsert({
              user_id: userId,
              email: userData.user.email,
              role: role,
              first_name: additionalData.first_name,
              last_name: additionalData.last_name,
              specialty: additionalData.specialty,
              tenant_id: tenantId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' })
        } catch (profileError) {
          console.error('Erreur lors de la création du profil:', profileError)
        }

        // Créer tenant_members si tenant_id fourni
        if (tenantId) {
          try {
            await supabaseAdmin
              .from('tenant_members')
              .upsert({
                user_id: userId,
                tenant_id: tenantId,
                role: role || 'intervenant',
                status: 'active',
                invited_by: user.id,
                joined_at: new Date().toISOString()
              }, { onConflict: 'tenant_id,user_id' })
          } catch (memberError) {
            console.error('Erreur lors de la création du membership:', memberError)
          }
        }
        
        return new Response(
          JSON.stringify({ success: true, userId }),
          { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        )
      }
      
      throw new Error("Échec de la création de l'utilisateur")
    }
    
    return new Response(
      JSON.stringify({ error: 'Action non reconnue' }),
      { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    )
  }
}) 
