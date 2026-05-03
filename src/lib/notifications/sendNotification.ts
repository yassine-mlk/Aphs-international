import { supabase } from '@/lib/supabase';

export interface NotificationPayload {
  userId: string;
  tenantId?: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  data?: Record<string, any>;
  referenceId?: string;
  sendEmail?: boolean;
  emailData?: {
    to: string;
    subject: string;
    template: string;
    variables: Record<string, string>;
  };
}

/**
 * Envoie une notification in-app et optionnellement un email
 */
export async function sendNotification(payload: NotificationPayload) {
  try {
    // 1. Toujours insérer en base (in-app)
    const { error: notifError } = await supabase.from('notifications').insert({
      user_id: payload.userId,
      tenant_id: payload.tenantId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      link: payload.link,
      data: payload.data || {},
      reference_id: payload.referenceId,
      is_read: false
    });

    if (notifError) {
      // Si c'est une erreur de duplicata (code 23505), on ignore silencieusement
      if ((notifError as any).code === '23505') {
        return;
      }
      console.error('Error inserting notification:', notifError);
    }

    // 2. Vérifier si on doit envoyer un email (soit forcé, soit via settings)
    const { data: settings } = await supabase
      .from('system_settings')
      .select('email_notifications_enabled')
      .single();

    if (payload.sendEmail || settings?.email_notifications_enabled) {
      // 3. Récupérer l'email de l'utilisateur et sa préférence personnelle
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, email_notifications')
        .eq('user_id', payload.userId)
        .single();

      if (profile?.email && (payload.sendEmail || profile?.email_notifications !== false)) {
        // 4. Envoyer l'email via Edge Function
        await supabase.functions.invoke('send-notification-email', {
          body: {
            to: payload.emailData?.to || profile.email,
            subject: payload.emailData?.subject || payload.title,
            template: payload.emailData?.template || 'generic_notification',
            variables: payload.emailData?.variables || {
              title: payload.title,
              message: payload.message,
              link: payload.link || '',
              type: payload.type
            }
          }
        });
      }
    }
  } catch (error) {
    console.error('sendNotification error:', error);
  }
}

/**
 * Notifie plusieurs utilisateurs
 */
export async function sendBulkNotifications(payloads: NotificationPayload[]) {
  return Promise.all(payloads.map(p => sendNotification(p)));
}

/**
 * Helper pour récupérer les admins d'un tenant
 */
export async function getTenantAdmins(tenantId: string): Promise<string[]> {
  const { data } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('tenant_id', tenantId)
    .eq('role', 'admin');
  
  return data?.map(a => a.user_id) || [];
}

/**
 * Helper pour récupérer le nom d'un utilisateur
 */
export async function getUserName(userId: string): Promise<string> {
  const { data } = await supabase
    .from('profiles')
    .select('first_name, last_name')
    .eq('user_id', userId)
    .single();
  
  return data ? `${data.first_name} ${data.last_name}` : 'Utilisateur';
}
