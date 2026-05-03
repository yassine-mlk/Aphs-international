import { sendNotification } from '../notifications';
import { getTenantAdmins, getUserName } from './sendNotification';
import { supabase } from '@/lib/supabase';

/**
 * Notifier l'admin quand un intervenant demande une visio
 */
export async function notifyMeetingRequest(intervenantId: string, subject: string, date?: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('user_id', intervenantId)
    .single();

  if (!profile) return;

  const intervenantName = await getUserName(intervenantId);
  const adminIds = await getTenantAdmins(profile.tenant_id);
  const dateText = date ? new Date(date).toLocaleString('fr-FR') : 'Non spécifiée';

  // Envoyer à tous les admins du tenant
  for (const adminId of adminIds) {
    await sendNotification({
      userId: adminId,
      type: 'meeting_request',
      title: `📹 Demande de visioconférence`,
      message: `${intervenantName} demande une réunion visio. Objet : ${subject}. Date souhaitée : ${dateText}`,
      link: '/dashboard/videoconference?tab=pending',
      sendEmail: true,
      emailData: {
        to: '', // Récupéré auto
        subject: `Nouvelle demande de visioconférence - ${subject}`,
        template: 'meeting_request',
        variables: {
          intervenantName,
          subject,
          dateText,
          link: 'https://aps-v3.vercel.app/dashboard/videoconference?tab=pending'
        }
      }
    });
  }
}

/**
 * Notifier l'intervenant quand l'admin accepte une demande de visio
 */
export async function notifyMeetingAccepted(intervenantId: string, date: string, link: string, subject: string) {
  const dateText = new Date(date).toLocaleString('fr-FR');
  
  await sendNotification({
    userId: intervenantId,
    type: 'meeting_accepted',
    title: `✅ Visioconférence acceptée`,
    message: `Votre demande de visioconférence "${subject}" a été acceptée pour le ${dateText}.`,
    link: '/dashboard/videoconference',
    sendEmail: true,
    emailData: {
      to: '', // Récupéré auto
      subject: `Visioconférence acceptée: ${subject}`,
      template: 'meeting_accepted',
      variables: {
        subject,
        dateText,
        link
      }
    }
  });
}

/**
 * Notifier l'intervenant quand l'admin refuse une demande de visio
 */
export async function notifyMeetingRefused(intervenantId: string, subject: string, reason?: string) {
  const reasonText = reason ? ` Motif : ${reason}` : '';
  
  await sendNotification({
    userId: intervenantId,
    type: 'meeting_refused',
    title: `❌ Demande de visioconférence refusée`,
    message: `Votre demande "${subject}" a été refusée.${reasonText}`,
    link: '/dashboard/videoconference',
    sendEmail: true,
    emailData: {
      to: '', // Récupéré auto
      subject: `Demande de visioconférence refusée: ${subject}`,
      template: 'meeting_refused',
      variables: {
        subject,
        reason: reason || 'Non spécifié'
      }
    }
  });
}

/**
 * Rappel 30 minutes avant la visio
 */
export async function notifyMeetingReminder(participantIds: string[], title: string, date: string, link: string) {
  const dateText = new Date(date).toLocaleString('fr-FR');

  for (const userId of participantIds) {
    await sendNotification({
      userId,
      type: 'meeting_reminder',
      title: `⏰ Rappel — Visioconférence dans 30 minutes`,
      message: `Votre réunion "${title}" commence bientôt (${dateText}).`,
      link: '/dashboard/videoconference',
      sendEmail: true,
      emailData: {
        to: '', // Récupéré auto
        subject: `Rappel: Visioconférence ${title}`,
        template: 'meeting_reminder',
        variables: {
          title,
          dateText,
          link
        }
      }
    });
  }
}
