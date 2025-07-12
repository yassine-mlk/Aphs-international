import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { NotificationType } from '@/hooks/useNotifications';
import { useTranslatedNotifications } from '@/hooks/useTranslatedNotifications';

export function useNotificationTriggers() {
  const { formatMessage, translations } = useTranslatedNotifications();
  
  // Créer une notification pour un utilisateur spécifique
  const createNotification = useCallback(async (
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data: Record<string, any> = {}
  ) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type,
          title,
          message,
          data
        });

      if (error) throw error;
    } catch (error) {
      console.error('Erreur lors de la création de notification:', error);
    }
  }, []);

  // Créer une notification pour tous les admins
  const createAdminNotification = useCallback(async (
    type: NotificationType,
    title: string,
    message: string,
    data: Record<string, any> = {}
  ) => {
    try {
      // Récupérer tous les admins
      const { data: admins, error: adminsError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('role', 'admin');

      if (adminsError) throw adminsError;

      // Créer une notification pour chaque admin
      const notifications = admins?.map(admin => ({
        user_id: admin.user_id,
        type,
        title,
        message,
        data
      })) || [];

      if (notifications.length > 0) {
        const { error } = await supabase
          .from('notifications')
          .insert(notifications);

        if (error) throw error;
      }
    } catch (error) {
      console.error('Erreur lors de la création de notifications admin:', error);
    }
  }, []);

  // Notifications pour les uploads de fichiers
  const notifyFileUploaded = useCallback(async (
    fileName: string,
    uploaderName: string,
    projectName?: string
  ) => {
    const notifConfig = translations.types.file_uploaded;
    const title = formatMessage(notifConfig.title, { uploaderName, fileName, projectName });
    const message = formatMessage(notifConfig.message, { uploaderName, fileName, projectName });
    
    await createAdminNotification(
      'file_uploaded',
      title,
      message,
      { fileName, uploaderName, projectName }
    );
  }, [createAdminNotification, formatMessage, translations]);

  // Notifications pour la validation de tâches
  const notifyTaskValidated = useCallback(async (
    taskName: string,
    validatorName: string,
    projectName?: string
  ) => {
    const notifConfig = translations.types.task_validated;
    const title = formatMessage(notifConfig.title, { validatorName, taskName, projectName });
    const message = formatMessage(notifConfig.message, { validatorName, taskName, projectName });
    
    await createAdminNotification(
      'task_validated',
      title,
      message,
      { taskName, validatorName, projectName }
    );
  }, [createAdminNotification, formatMessage, translations]);

  // Notifications pour les nouveaux messages
  const notifyNewMessage = useCallback(async (
    recipientId: string,
    senderName: string,
    subject?: string
  ) => {
    const notifConfig = translations.types.message_received;
    const title = formatMessage(notifConfig.title, { senderName, subject });
    const message = formatMessage(notifConfig.message, { senderName, subject });
    
    await createNotification(
      recipientId,
      'message_received',
      title,
      message,
      { senderName, subject }
    );
  }, [createNotification, formatMessage, translations]);

  // Notifications pour les demandes de réunion
  const notifyMeetingRequest = useCallback(async (
    meetingTitle: string,
    requesterName: string,
    scheduledTime: string
  ) => {
    const notifConfig = translations.types.meeting_request;
    const scheduledDate = new Date(scheduledTime).toLocaleDateString();
    const title = formatMessage(notifConfig.title, { meetingTitle, requesterName, scheduledDate });
    const message = formatMessage(notifConfig.message, { meetingTitle, requesterName, scheduledDate });
    
    await createAdminNotification(
      'meeting_request',
      title,
      message,
      { meetingTitle, requesterName, scheduledTime, scheduledDate }
    );
  }, [createAdminNotification, formatMessage, translations]);

  // Notifications pour l'assignation de tâches
  const notifyTaskAssigned = useCallback(async (
    intervenantId: string,
    taskName: string,
    projectName?: string,
    assignerName?: string
  ) => {
    const notifConfig = translations.types.task_assigned;
    const title = formatMessage(notifConfig.title, { taskName, projectName, assignerName });
    const message = formatMessage(notifConfig.message, { taskName, projectName, assignerName });
    
    await createNotification(
      intervenantId,
      'task_assigned',
      title,
      message,
      { taskName, projectName, assignerName }
    );
  }, [createNotification, formatMessage, translations]);

  // Notifications pour l'ajout à un projet
  const notifyProjectAdded = useCallback(async (
    intervenantId: string,
    projectName: string,
    adminName?: string
  ) => {
    await createNotification(
      intervenantId,
      'project_added',
      'Ajouté à un nouveau projet',
      `Vous avez été ajouté au projet "${projectName}"${adminName ? ` par ${adminName}` : ''}`,
      { projectName, adminName }
    );
  }, [createNotification]);

  // Notifications pour la demande de validation de tâche
  const notifyTaskValidationRequest = useCallback(async (
    validatorId: string,
    taskName: string,
    intervenantName: string,
    projectName?: string
  ) => {
    await createNotification(
      validatorId,
      'task_validation_request',
      'Demande de validation de tâche',
      `${intervenantName} demande la validation de la tâche "${taskName}"${projectName ? ` du projet ${projectName}` : ''}`,
      { taskName, intervenantName, projectName }
    );
  }, [createNotification]);

  // Notifications pour la validation de fichiers
  const notifyFileValidationRequest = useCallback(async (
    validatorId: string,
    fileName: string,
    uploaderName: string,
    projectName?: string
  ) => {
    const notifConfig = translations.types.file_validation_request;
    const title = formatMessage(notifConfig.title, { fileName, uploaderName, projectName });
    const message = formatMessage(notifConfig.message, { fileName, uploaderName, projectName });
    
    await createNotification(
      validatorId,
      'file_validation_request',
      title,
      message,
      { fileName, uploaderName, projectName }
    );
  }, [createNotification, formatMessage, translations]);

  // Notifications pour les réponses aux demandes de réunion
  const notifyMeetingRequestResponse = useCallback(async (
    requesterId: string,
    meetingTitle: string,
    approved: boolean,
    adminName?: string,
    responseMessage?: string
  ) => {
    const status = approved ? 'approuvée' : 'refusée';
    const title = approved ? 'Demande de réunion approuvée' : 'Demande de réunion refusée';
    const baseMessage = `Votre demande de réunion "${meetingTitle}" a été ${status}${adminName ? ` par ${adminName}` : ''}`;
    const message = responseMessage ? `${baseMessage}. Message : ${responseMessage}` : baseMessage;

    await createNotification(
      requesterId,
      approved ? 'meeting_request_approved' : 'meeting_request_rejected',
      title,
      message,
      { meetingTitle, approved, adminName, responseMessage }
    );
  }, [createNotification]);

  // Notifications pour les invitations de réunion
  const notifyMeetingInvitation = useCallback(async (
    participantId: string,
    meetingTitle: string,
    organizerName: string,
    scheduledTime: string
  ) => {
    await createNotification(
      participantId,
      'meeting_invitation',
      'Invitation à une réunion',
      `${organizerName} vous invite à la réunion "${meetingTitle}" prévue le ${new Date(scheduledTime).toLocaleDateString('fr-FR')}`,
      { meetingTitle, organizerName, scheduledTime }
    );
  }, [createNotification]);

  // Notifications pour les réunions acceptées
  const notifyMeetingAccepted = useCallback(async (
    organizerId: string,
    meetingTitle: string,
    participantName: string
  ) => {
    await createNotification(
      organizerId,
      'meeting_accepted',
      'Réunion acceptée',
      `${participantName} a accepté votre invitation à la réunion "${meetingTitle}"`,
      { meetingTitle, participantName }
    );
  }, [createNotification]);

  // Notifications pour les réunions refusées
  const notifyMeetingDeclined = useCallback(async (
    organizerId: string,
    meetingTitle: string,
    participantName: string,
    reason?: string
  ) => {
    await createNotification(
      organizerId,
      'meeting_declined',
      'Réunion refusée',
      `${participantName} a refusé votre invitation à la réunion "${meetingTitle}"${reason ? ` : ${reason}` : ''}`,
      { meetingTitle, participantName, reason }
    );
  }, [createNotification]);

  return {
    createNotification,
    createAdminNotification,
    notifyFileUploaded,
    notifyTaskValidated,
    notifyNewMessage,
    notifyMeetingRequest,
    notifyMeetingRequestResponse,
    notifyTaskAssigned,
    notifyProjectAdded,
    notifyTaskValidationRequest,
    notifyFileValidationRequest,
    notifyMeetingInvitation,
    notifyMeetingAccepted,
    notifyMeetingDeclined
  };
} 