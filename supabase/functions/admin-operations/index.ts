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
          .from('tenant_members')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .neq('role', 'admin')
          .eq('status', 'active')

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

      // Créer le membership tenant si tenant_id fourni
      if (tenantId) {
        const { error: memberError } = await supabaseAdmin
          .from('tenant_members')
          .insert({
            user_id: authData.user.id,
            tenant_id: tenantId,
            role: role,
            status: 'active',
            invited_by: caller?.id,
            joined_at: new Date().toISOString(),
          })
        if (memberError) throw memberError
      }

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
      const { userId, tenantId } = data
      console.log(`Suppression de l'utilisateur: ${userId}, tenantId: ${tenantId}`);

      // Vérifier si l'utilisateur est admin d'UN AUTRE tenant actif
      let isAdminElsewhere = false
      if (tenantId) {
        try {
          const { data: otherMemberships } = await supabaseAdmin
            .from('tenant_members')
            .select('role')
            .eq('user_id', userId)
            .neq('tenant_id', tenantId)
            .eq('status', 'active')
          isAdminElsewhere = otherMemberships?.some(m => m.role === 'admin') ?? false
        } catch (e) {
          console.warn("Impossible de vérifier les autres memberships:", e.message);
        }
      }

      if (isAdminElsewhere) {
        // RETRAIT : l'utilisateur est admin ailleurs → ne retirer QUE du tenant courant
        console.log(`Utilisateur ${userId} admin ailleurs → retrait partiel du tenant ${tenantId}`);
        
        try {
          const { error: mError } = await supabaseAdmin
            .from('tenant_members')
            .delete()
            .eq('user_id', userId)
            .eq('tenant_id', tenantId)
          if (mError) throw mError
        } catch (e) {
          console.error("Erreur lors du retrait tenant_members:", e.message);
        }

        try {
          const { error: mmError } = await supabaseAdmin
            .from('membre')
            .delete()
            .eq('user_id', userId)
            .eq('tenant_id', tenantId)
          if (mmError) throw mmError
        } catch (e) {
          console.error("Erreur lors du retrait membre:", e.message);
        }

        return new Response(
          JSON.stringify({ success: true, message: "Utilisateur retiré du tenant" }),
          { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        )
      }

      // DESTRUCTION COMPLÈTE : l'utilisateur n'est admin nulle part ailleurs
      console.log(`Utilisateur ${userId} non-admin ailleurs → destruction complète`);

      // Clean up associated data
      const tables = [
        { table: 'tenant_members', column: 'user_id' },
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
