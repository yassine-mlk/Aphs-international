import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = ['https://www.aps-construction.com', 'https://aps-construction.com'];

const getCorsHeaders = (req?: Request) => {
  const origin = req?.headers?.get('origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400',
  };
};

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

  try {
    // Create Supabase admin client (SERVICE_ROLE_KEY stays server-side only)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
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

    // Verify caller is admin or super admin
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role, is_super_admin, tenant_id')
      .eq('user_id', caller.id)
      .maybeSingle()

    const isAdmin = callerProfile?.role === 'admin' || callerProfile?.is_super_admin === true
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Droits administrateur requis' }),
        { status: 403, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    const { action, ...data } = await req.json()

    // ==================== CREATE USER ====================
    if (action === 'createUser') {
      const { email, password, role, additionalData } = data
      const tenantId = additionalData?.tenant_id || callerProfile?.tenant_id

      // Check intervenant quota
      if (tenantId && role !== 'admin') {
        const { data: tenantData } = await supabaseAdmin
          .from('tenants')
          .select('max_intervenants')
          .eq('id', tenantId)
          .maybeSingle()

        const { count: currentCount } = await supabaseAdmin
          .from('profiles')
          .select('user_id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .neq('role', 'admin')
          .neq('is_super_admin', true)

        const max = tenantData?.max_intervenants ?? null
        if (max !== null && (currentCount ?? 0) >= max) {
          return new Response(
            JSON.stringify({ error: `Quota d'intervenants atteint (${max})`, code: 'QUOTA_EXCEEDED' }),
            { status: 409, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
          )
        }
      }

      // Create auth user
      const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role, ...additionalData },
      })

      if (createError) {
        if (createError.message?.includes('already registered')) {
          return new Response(
            JSON.stringify({ error: 'Un utilisateur avec cet email existe déjà', code: 'ALREADY_EXISTS' }),
            { status: 409, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
          )
        }
        throw createError
      }

      if (!authData?.user) {
        throw new Error("Échec de la création de l'utilisateur")
      }

      // Validate company_id
      let validCompanyId: string | null = null
      if (additionalData?.company_id &&
        additionalData.company_id !== 'independant' &&
        additionalData.company_id !== '' &&
        typeof additionalData.company_id === 'string' &&
        additionalData.company_id.length === 36) {
        validCompanyId = additionalData.company_id
      }

      // Create profile
      await supabaseAdmin
        .from('profiles')
        .upsert({
          user_id: authData.user.id,
          email,
          first_name: additionalData?.first_name || '',
          last_name: additionalData?.last_name || '',
          role,
          specialty: additionalData?.specialty || '',
          company: additionalData?.company || 'Indépendant',
          company_id: validCompanyId,
          phone: additionalData?.phone || '',
          tenant_id: tenantId,
          status: 'active',
          theme: 'light',
          language: 'fr',
          email_notifications: true,
          push_notifications: true,
          message_notifications: true,
          update_notifications: true
        }, { onConflict: 'user_id' })

      // Envoi de l'email de bienvenue
      await supabaseAdmin.functions.invoke('send-notification-email', {
        body: {
          to: email,
          type: 'welcome_email',
          data: {
            email: email,
            password: password,
            firstName: additionalData?.first_name || '',
            lastName: additionalData?.last_name || '',
            role: role
          }
        }
      }).catch(err => console.error('Erreur lors de l\'envoi de l\'email de bienvenue:', err))

      return new Response(
        JSON.stringify({ success: true, userId: authData.user.id }),
        { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    // ==================== LIST USERS ====================
    if (action === 'listUsers') {
      const { data: users, error } = await supabaseAdmin.auth.admin.listUsers()
      if (error) throw error
      return new Response(
        JSON.stringify({ users: users.users }),
        { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    // ==================== UPDATE USER ====================
    if (action === 'updateUser') {
      const { userId, userData } = data

      const updates: Record<string, unknown> = {}

      if (userData.role || userData.first_name || userData.last_name || userData.specialty) {
        const { data: currentUser } = await supabaseAdmin.auth.admin.getUserById(userId)
        const currentMetadata = currentUser?.user?.user_metadata || {}
        updates.user_metadata = {
          ...currentMetadata,
          ...(userData.role && { role: userData.role }),
          ...(userData.first_name && { first_name: userData.first_name }),
          ...(userData.last_name && { last_name: userData.last_name }),
          ...(userData.specialty && { specialty: userData.specialty }),
          ...(userData.first_name && userData.last_name && { name: `${userData.first_name} ${userData.last_name}` })
        }
      }

      if (userData.email) updates.email = userData.email
      if (userData.password) updates.password = userData.password

      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, updates)
      if (error) throw error

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    // ==================== DELETE USER ====================
    if (action === 'deleteUser') {
      const { userId } = data
      console.log(`Suppression de l'utilisateur: ${userId}`);

      // Verify not deleting an admin
      try {
        const { data: targetUser, error: getError } = await supabaseAdmin.auth.admin.getUserById(userId)
        if (getError) {
           console.warn(`Avertissement: Impossible de trouver l'utilisateur auth ${userId}:`, getError.message);
        } else if (targetUser?.user?.user_metadata?.role === 'admin') {
          return new Response(
            JSON.stringify({ error: "Impossible de supprimer un administrateur" }),
            { status: 403, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
          )
        }
      } catch (e) {
        console.error("Erreur lors de la vérification du rôle:", e.message);
      }

      // Clean up associated data
      const tables = [
        { table: 'conversation_participants', column: 'user_id' },
        { table: 'message_reads', column: 'user_id' },
        { table: 'workgroup_members', column: 'user_id' },
        { table: 'membre', column: 'user_id' },
        { table: 'video_meeting_participants', column: 'user_id' },
        { table: 'document_recipients', column: 'user_id' },
      ]

      for (const { table, column } of tables) {
        try {
          const { error: delError } = await supabaseAdmin.from(table).delete().eq(column, userId)
          if (delError) console.warn(`Erreur non-bloquante lors de la suppression dans ${table}:`, delError.message);
        } catch (e) {
          console.warn(`Exception lors du cleanup de ${table}:`, e.message);
        }
      }

      // Anonymize messages
      try {
        const { error: rpcError } = await supabaseAdmin.rpc('anonymize_user_messages', { user_id_param: userId })
        if (rpcError) console.warn("Erreur RPC anonymize_user_messages:", rpcError.message);
      } catch (e) {
        console.warn("Exception RPC anonymize_user_messages:", e.message);
      }

      // Delete profile
      try {
        const { error: profError } = await supabaseAdmin.from('profiles').delete().eq('user_id', userId)
        if (profError) console.warn("Erreur lors de la suppression du profil:", profError.message);
      } catch (e) {
        console.warn("Exception lors de la suppression du profil:", e.message);
      }

      // Delete auth user
      const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (deleteAuthError) {
        console.error("Erreur fatale lors de la suppression Auth:", deleteAuthError.message);
        // Si l'utilisateur n'existe plus, on considère ça comme un succès
        if (deleteAuthError.message?.includes('not found') || deleteAuthError.status === 404) {
          return new Response(
            JSON.stringify({ success: true, message: "L'utilisateur n'existait déjà plus" }),
            { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
          )
        }
        throw deleteAuthError
      }

      console.log(`Utilisateur ${userId} supprimé avec succès`);
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
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
