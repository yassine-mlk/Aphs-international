import { supabase } from '@/lib/supabase';
import { NotificationType } from '@/hooks/useNotifications';

export interface NotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  sendEmail?: boolean;
  emailData?: {
    to: string;
    subject: string;
    template: 'task_assigned' | 'task_validated' | 'member_added' | 'message_received' | 'signature_request' | 'signature_confirmed' | 'workflow_status_changed';
    variables: Record<string, string>;
  };
}

/**
 * Envoie une notification in-app et optionnellement un email
 */
export async function sendNotification({
  userId,
  type,
  title,
  message,
  data = {},
  sendEmail = false,
  emailData
}: NotificationData): Promise<boolean> {
  try {
    // 1. Créer la notification dans la base de données
    const { error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        data,
        read: false
      });

    if (notifError) {
      console.error('Error creating notification:', notifError);
      return false;
    }

    // 2. Envoyer l'email si demandé
    if (sendEmail && emailData) {
      try {
        // Récupérer l'email automatiquement si non fourni
        let userEmail = emailData.to;
        if (!userEmail) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', userId)
            .single();
          userEmail = profile?.email;
        }

        if (userEmail) {
          await supabase.functions.invoke('send-notification-email', {
            body: {
              to: userEmail,
              subject: emailData.subject,
              template: emailData.template,
              variables: emailData.variables
            }
          });
        }
      } catch (emailError) {
        console.error('Error sending email notification:', emailError);
        // On continue même si l'email échoue
      }
    }

    return true;
  } catch (error) {
    console.error('Error in sendNotification:', error);
    return false;
  }
}

/**
 * Notifie plusieurs utilisateurs à la fois
 */
export async function sendBulkNotifications(
  notifications: Omit<NotificationData, 'sendEmail' | 'emailData'>[],
  sendEmail = false
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert(
        notifications.map(n => ({
          user_id: n.userId,
          type: n.type,
          title: n.title,
          message: n.message,
          data: n.data || {},
          read: false
        }))
      );

    if (error) {
      console.error('Error creating bulk notifications:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in sendBulkNotifications:', error);
    return false;
  }
}

/**
 * Notifications spécifiques pour les workflows
 */
export async function notifyWorkflowStatusChange({
  userId,
  taskName,
  projectName,
  status,
  actorName,
}: {
  userId: string;
  taskName: string;
  projectName: string;
  status: 'validated' | 'rejected' | 'pending';
  actorName: string;
}) {
  const statusText = status === 'validated' ? 'validée' : status === 'rejected' ? 'refusée' : 'en attente';
  const type: NotificationType = status === 'validated' ? 'task_validated' : 'task_validation_request';

  return sendNotification({
    userId,
    type,
    title: `Tâche ${statusText}`,
    message: `La tâche "${taskName}" du projet "${projectName}" a été ${statusText} par ${actorName}`,
    data: { taskName, projectName, status, actorName },
    sendEmail: true,
    emailData: {
      to: '', // Sera récupéré automatiquement
      subject: `Tâche ${statusText} - ${taskName}`,
      template: 'workflow_status_changed',
      variables: {
        taskName,
        projectName,
        status: statusText,
        actorName
      }
    }
  });
}

/**
 * Notification pour ajout de membre à un projet
 */
export async function notifyMemberAdded({
  userId,
  projectName,
  addedByName,
  role,
}: {
  userId: string;
  projectName: string;
  addedByName: string;
  role: string;
}) {
  return sendNotification({
    userId,
    type: 'project_added',
    title: 'Ajouté à un projet',
    message: `Vous avez été ajouté au projet "${projectName}" par ${addedByName} en tant que ${role}`,
    data: { projectName, addedByName, role },
    sendEmail: true,
    emailData: {
      to: '', // Sera récupéré automatiquement
      subject: `Vous êtes membre du projet ${projectName}`,
      template: 'member_added',
      variables: {
        projectName,
        addedByName,
        role
      }
    }
  });
}

/**
 * Notification pour nouveau message
 */
export async function notifyNewMessage({
  userId,
  senderName,
  messagePreview,
  conversationId,
}: {
  userId: string;
  senderName: string;
  messagePreview: string;
  conversationId: string;
}) {
  return sendNotification({
    userId,
    type: 'message_received',
    title: 'Nouveau message',
    message: `${senderName}: "${messagePreview.substring(0, 50)}${messagePreview.length > 50 ? '...' : ''}"`,
    data: { senderName, conversationId },
    sendEmail: true,
    emailData: {
      to: '', // Sera récupéré automatiquement
      subject: `Nouveau message de ${senderName}`,
      template: 'message_received',
      variables: {
        senderName,
        messagePreview: messagePreview.substring(0, 100)
      }
    }
  });
}

/**
 * Notification pour assignation de tâche standard
 */
export async function notifyTaskAssigned({
  userId,
  taskName,
  projectName,
  assignedByName,
  dueDate,
}: {
  userId: string;
  taskName: string;
  projectName: string;
  assignedByName: string;
  dueDate?: string;
}) {
  const dueText = dueDate ? ` (Échéance: ${new Date(dueDate).toLocaleDateString('fr-FR')})` : '';
  
  return sendNotification({
    userId,
    type: 'task_assigned',
    title: 'Nouvelle tâche assignée',
    message: `La tâche "${taskName}" du projet "${projectName}" vous a été assignée par ${assignedByName}${dueText}`,
    data: { taskName, projectName, assignedByName, dueDate },
    sendEmail: true,
    emailData: {
      to: '', // Sera récupéré automatiquement
      subject: `Nouvelle tâche: ${taskName}`,
      template: 'task_assigned',
      variables: {
        taskName,
        projectName,
        assignedByName,
        dueDate: dueDate || 'Non définie'
      }
    }
  });
}

/**
 * Notification pour signature de document confirmée
 */
export async function notifyDocumentSigned({
  userId,
  documentName,
  signerName,
  projectName,
}: {
  userId: string;
  documentName: string;
  signerName: string;
  projectName: string;
}) {
  return sendNotification({
    userId,
    type: 'document_signed',
    title: 'Document signé',
    message: `${signerName} a signé le document "${documentName}" du projet "${projectName}"`,
    data: { documentName, signerName, projectName },
    sendEmail: true,
    emailData: {
      to: '', // Sera récupéré automatiquement
      subject: `Document signé: ${documentName}`,
      template: 'signature_confirmed',
      variables: {
        documentName,
        signerName,
        projectName
      }
    }
  });
}
