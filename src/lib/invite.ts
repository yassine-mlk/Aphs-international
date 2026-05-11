import { supabase } from '@/lib/supabase';
import { sendNotification } from '@/lib/notifications';

export interface InviteResult {
  success: boolean;
  userId?: string;
  error?: string;
  isNewUser?: boolean;
}

/**
 * Invite un intervenant à rejoindre un tenant.
 * 1. Cherche si l'utilisateur existe déjà dans auth.users
 * 2. Si oui → crée juste le membership
 * 3. Si non → crée le user auth + profil + membership (via RPC SECURITY DEFINER)
 * 4. Envoie une notification à l'intervenant
 */
export async function inviteIntervenant(
  email: string,
  tenantId: string,
  invitedBy: string,
  tenantName: string,
  firstName?: string,
  lastName?: string,
): Promise<InviteResult> {
  try {
    // 1. Vérifier si l'utilisateur existe déjà dans profiles
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('user_id, first_name, last_name')
      .eq('email', email)
      .maybeSingle();

    if (existingProfile) {
      // 2. User existe → vérifier s'il n'est pas déjà membre
      const { data: existingMembership } = await supabase
        .from('tenant_members')
        .select('id')
        .eq('user_id', existingProfile.user_id)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (existingMembership) {
        return {
          success: false,
          error: 'Cet intervenant est déjà membre de votre espace',
        };
      }

      // Créer le membership
      const { error: memberError } = await supabase
        .from('tenant_members')
        .insert({
          user_id: existingProfile.user_id,
          tenant_id: tenantId,
          role: 'intervenant',
          status: 'active',
          invited_by: invitedBy,
          joined_at: new Date().toISOString(),
        });

      if (memberError) throw memberError;

      // Mettre à jour le prénom/nom si fournis
      if (firstName || lastName) {
        await supabase.from('profiles').update({
          ...(firstName && { first_name: firstName }),
          ...(lastName && { last_name: lastName }),
        }).eq('user_id', existingProfile.user_id);
      }

      // Notifier l'intervenant existant
      await sendNotification({
        userId: existingProfile.user_id,
        tenantId,
        type: 'tenant_invitation',
        title: 'Vous avez été ajouté à un nouvel espace',
        message: `Vous avez été invité à rejoindre l'espace ${tenantName}.`,
      });

      return {
        success: true,
        userId: existingProfile.user_id,
        isNewUser: false,
      };
    }

    // 3. User n'existe pas → utiliser le RPC pour créer auth + profil + membership
    const { data: rpcResult, error: rpcError } = await supabase.rpc('invite_user_to_tenant', {
      p_email: email,
      p_first_name: firstName || '',
      p_last_name: lastName || '',
      p_role: 'intervenant',
      p_tenant_id: tenantId,
      p_invited_by: invitedBy,
    });

    if (rpcError) throw rpcError;
    if (!rpcResult?.success) throw new Error(rpcResult?.error || 'Échec de l\'invitation');

    // Notifier le nouvel utilisateur
    await sendNotification({
      userId: rpcResult.user_id,
      tenantId,
      type: 'tenant_invitation',
      title: 'Bienvenue sur APS',
      message: `Vous avez été invité à rejoindre l'espace ${tenantName}. Connectez-vous pour commencer.`,
    });

    return {
      success: true,
      userId: rpcResult.user_id,
      isNewUser: rpcResult.is_new,
    };

  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Une erreur est survenue lors de l\'invitation',
    };
  }
}
