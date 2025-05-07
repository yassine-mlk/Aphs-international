import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
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
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: verifyError } = await supabaseAdmin.auth.getUser(token)

  if (verifyError || !user) {
    return new Response(
      JSON.stringify({ error: 'Token invalide' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Vérifier que l'utilisateur est un admin
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = user.user_metadata?.role === 'admin' || profile?.role === 'admin'

  if (!isAdmin) {
    return new Response(
      JSON.stringify({ error: 'Droits administrateur requis' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
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
        { status: 200, headers: { 'Content-Type': 'application/json' } }
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
        // Création du profil utilisateur
        try {
          await supabaseAdmin
            .from('profiles')
            .insert({
              id: userData.user.id,
              email: userData.user.email,
              role: role,
              first_name: additionalData.first_name,
              last_name: additionalData.last_name,
              specialty: additionalData.specialty,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
        } catch (profileError) {
          console.error('Erreur lors de la création du profil:', profileError)
        }
        
        return new Response(
          JSON.stringify({ success: true, userId: userData.user.id }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      
      throw new Error("Échec de la création de l'utilisateur")
    }
    
    return new Response(
      JSON.stringify({ error: 'Action non reconnue' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}) 