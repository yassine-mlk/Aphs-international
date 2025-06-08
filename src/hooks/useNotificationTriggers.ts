import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { NotificationType } from '@/hooks/useNotifications';

export function useNotificationTriggers() {
  
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
        .select('id')
        .eq('role', 'admin');

      if (adminsError) throw adminsError;

      // Créer une notification pour chaque admin
      const notifications = admins?.map(admin => ({
        user_id: admin.id,
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
    await createAdminNotification(
      'file_uploaded',
      'Nouveau fichier uploadé',
      `${uploaderName} a uploadé le fichier "${fileName}"${projectName ? ` dans le projet ${projectName}` : ''}`,
      { fileName, uploaderName, projectName }
    );
  }, [createAdminNotification]);

  // Notifications pour la validation de tâches
  const notifyTaskValidated = useCallback(async (
    taskName: string,
    validatorName: string,
    projectName?: string
  ) => {
    await createAdminNotification(
      'task_validated',
      'Tâche validée',
      `${validatorName} a validé la tâche "${taskName}"${projectName ? ` du projet ${projectName}` : ''}`,
      { taskName, validatorName, projectName }
    );
  }, [createAdminNotification]);

  // Notifications pour les nouveaux messages
  const notifyNewMessage = useCallback(async (
    recipientId: string,
    senderName: string,
    subject?: string
  ) => {
    await createNotification(
      recipientId,
      'message_received',
      'Nouveau message',
      `Vous avez reçu un nouveau message de ${senderName}${subject ? ` : "${subject}"` : ''}`,
      { senderName, subject }
    );
  }, [createNotification]);

  // Notifications pour les demandes de réunion
  const notifyMeetingRequest = useCallback(async (
    meetingTitle: string,
    requesterName: string,
    scheduledTime: string
  ) => {
    await createAdminNotification(
      'meeting_request',
      'Demande de réunion',
      `${requesterName} a demandé une réunion : "${meetingTitle}" prévue le ${new Date(scheduledTime).toLocaleDateString('fr-FR')}`,
      { meetingTitle, requesterName, scheduledTime }
    );
  }, [createAdminNotification]);

  // Notifications pour l'assignation de tâches
  const notifyTaskAssigned = useCallback(async (
    intervenantId: string,
    taskName: string,
    projectName?: string,
    assignerName?: string
  ) => {
    await createNotification(
      intervenantId,
      'task_assigned',
      'Nouvelle tâche assignée',
      `Une nouvelle tâche "${taskName}" vous a été assignée${projectName ? ` pour le projet ${projectName}` : ''}${assignerName ? ` par ${assignerName}` : ''}`,
      { taskName, projectName, assignerName }
    );
  }, [createNotification]);

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
    await createNotification(
      validatorId,
      'file_validation_request',
      'Fichier à valider',
      `${uploaderName} a uploadé le fichier "${fileName}" qui nécessite votre validation${projectName ? ` pour le projet ${projectName}` : ''}`,
      { fileName, uploaderName, projectName }
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
    notifyTaskAssigned,
    notifyProjectAdded,
    notifyTaskValidationRequest,
    notifyFileValidationRequest,
    notifyMeetingInvitation,
    notifyMeetingAccepted,
    notifyMeetingDeclined
  };
} 