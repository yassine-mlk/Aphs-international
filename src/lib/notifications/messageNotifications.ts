import { sendNotification, sendBulkNotifications, getTenantAdmins, getUserName } from './sendNotification';
import { supabase } from '@/lib/supabase';

/**
 * Notifier le destinataire quand un message est reçu
 */
export async function notifyMessageReceived(recipientId: string, senderId: string, messageContent: string, conversationId: string) {
  const senderName = await getUserName(senderId);
  const preview = messageContent.length > 50 ? messageContent.substring(0, 50) + '...' : messageContent;

  // Récupérer les détails de la conversation
  const { data: conv } = await supabase
    .from('conversations')
    .select('type, name')
    .eq('id', conversationId)
    .single();

  let conversationName = conv?.name || 'Conversation';
  let titlePrefix = `💬 Nouveau message de ${senderName}`;
  
  if (conv?.type === 'group' || conv?.type === 'workgroup') {
    titlePrefix = `💬 Nouveau message dans le groupe de travail : ${conversationName}`;
  }

  await sendNotification({
    userId: recipientId,
    type: 'message_received',
    title: titlePrefix,
    message: preview,
    link: `/dashboard/messages?id=${conversationId}`,
    data: {
      senderName,
      projectName: conversationName
    }
  });
}

/**
 * Notifier l'admin si pas de réponse après 24h
 */
export async function notifyNoResponse24h(adminId: string, intervenantId: string) {
  const intervenantName = await getUserName(intervenantId);

  await sendNotification({
    userId: adminId,
    type: 'message_stale',
    title: `💬 Message sans réponse depuis 24h`,
    message: `${intervenantName} attend une réponse depuis 24h.`,
    link: `/dashboard/messages`,
    referenceId: `stale_message_${intervenantId}`
  });
}
