import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { NotificationType } from '@/hooks/useNotifications';

export function useNotificationTriggers() {
  
  // Créer une notification pour un utilisateur spécifique avec paramètres
  const createNotification = useCallback(async (
    userId: string,
    type: NotificationType,
    titleParams: Record<string, any> = {},
    messageParams: Record<string, any> = {},
    data: Record<string, any> = {}
  ) => {
    try {
      // Vérifier si les nouvelles colonnes existent
      const { data: columns, error: columnError } = await supabase
        .from('notifications')
        .select('*')
        .limit(0);

      if (columnError && columnError.message.includes('column')) {
        // Anciennes colonnes - mode de compatibilité
        console.warn('Mode compatibilité notifications - exécutez le script SQL pour activer les traductions');
        
        // Générer des messages par défaut en français
        const defaultTitle = getDefaultTitle(type, titleParams);
        const defaultMessage = getDefaultMessage(type, messageParams);
        
        const { error } = await supabase
          .from('notifications')
          .insert({
            user_id: userId,
            type,
            title: defaultTitle,
            message: defaultMessage,
            data
          });

        if (error) throw error;
      } else {
        // Nouvelles colonnes - mode complet avec traductions
        const { error } = await supabase
          .from('notifications')
          .insert({
            user_id: userId,
            type,
            title: '', // Sera rempli dynamiquement selon la langue
            message: '', // Sera rempli dynamiquement selon la langue
            title_key: type,
            message_key: type,
            title_params: titleParams,
            message_params: messageParams,
            data
          });

        if (error) throw error;
      }
    } catch (error) {
      console.error('Erreur lors de la création de notification:', error);
    }
  }, []);

  // Créer une notification pour tous les admins
  const createAdminNotification = useCallback(async (
    type: NotificationType,
    titleParams: Record<string, any> = {},
    messageParams: Record<string, any> = {},
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
      const notificationPromises = admins?.map(admin => 
        createNotification(admin.user_id, type, titleParams, messageParams, data)
      ) || [];

      await Promise.all(notificationPromises);
    } catch (error) {
      console.error('Erreur lors de la création de notifications admin:', error);
    }
  }, [createNotification]);

  // Fonctions utilitaires pour générer des messages par défaut
  const getDefaultTitle = (type: NotificationType, params: Record<string, any>): string => {
    switch (type) {
      case 'file_uploaded':
        return 'Nouveau fichier uploadé';
      case 'task_validated':
        return 'Tâche validée';
      case 'message_received':
        return 'Nouveau message';
      case 'meeting_request':
        return 'Demande de réunion';
      case 'task_assigned':
        return 'Nouvelle tâche assignée';
      case 'project_added':
        return 'Ajouté à un nouveau projet';
      case 'task_validation_request':
        return 'Demande de validation de tâche';
      case 'file_validation_request':
        return 'Fichier à valider';
      case 'meeting_request_approved':
        return 'Demande de réunion approuvée';
      case 'meeting_request_rejected':
        return 'Demande de réunion refusée';
      case 'meeting_invitation':
        return 'Invitation à une réunion';
      case 'meeting_started':
        return 'Réunion démarrée';
      case 'task_status_changed':
        return 'Statut de tâche modifié';
      default:
        return 'Notification';
    }
  };

  const getDefaultMessage = (type: NotificationType, params: Record<string, any>): string => {
    switch (type) {
      case 'file_uploaded':
        return `${params.uploaderName || 'Un utilisateur'} a uploadé le fichier "${params.fileName || 'fichier'}"${params.projectName ? ` dans le projet ${params.projectName}` : ''}`;
      case 'task_validated':
        return `${params.validatorName || 'Un validateur'} a validé la tâche "${params.taskName || 'tâche'}"${params.projectName ? ` du projet ${params.projectName}` : ''}`;
      case 'message_received':
        return `Vous avez reçu un nouveau message de ${params.senderName || 'un utilisateur'}${params.subject ? ` : "${params.subject}"` : ''}`;
      case 'meeting_request':
        return `${params.requesterName || 'Un utilisateur'} a demandé une réunion : "${params.meetingTitle || 'réunion'}" prévue le ${params.scheduledDate || 'date à définir'}`;
      case 'task_assigned':
        return `Une nouvelle tâche "${params.taskName || 'tâche'}" vous a été assignée${params.projectName ? ` pour le projet ${params.projectName}` : ''}${params.assignerName ? ` par ${params.assignerName}` : ''}`;
      case 'project_added':
        return `Vous avez été ajouté au projet "${params.projectName || 'projet'}"${params.adminName ? ` par ${params.adminName}` : ''}`;
      case 'task_validation_request':
        return `${params.intervenantName || 'Un intervenant'} demande la validation de la tâche "${params.taskName || 'tâche'}"${params.projectName ? ` du projet ${params.projectName}` : ''}`;
      case 'file_validation_request':
        return `${params.uploaderName || 'Un utilisateur'} a uploadé le fichier "${params.fileName || 'fichier'}" qui nécessite votre validation${params.projectName ? ` pour le projet ${params.projectName}` : ''}`;
      case 'meeting_request_approved':
        return `Votre demande de réunion "${params.meetingTitle || 'réunion'}" a été approuvée${params.adminName ? ` par ${params.adminName}` : ''}${params.responseMessage ? `. Message : ${params.responseMessage}` : ''}`;
      case 'meeting_request_rejected':
        return `Votre demande de réunion "${params.meetingTitle || 'réunion'}" a été refusée${params.adminName ? ` par ${params.adminName}` : ''}${params.responseMessage ? `. Message : ${params.responseMessage}` : ''}`;
      case 'meeting_invitation':
        return `${params.organizerName || 'Un organisateur'} vous invite à la réunion "${params.meetingTitle || 'réunion'}" prévue le ${params.scheduledDate || 'date à définir'}`;
      case 'meeting_started':
        return `La réunion "${params.meetingTitle || 'réunion'}" a démarré ! Rejoignez-la maintenant.`;
      case 'task_status_changed':
        return `${params.userName || 'Un utilisateur'} a ${params.statusLabel || 'modifié'} la tâche "${params.taskName || 'tâche'}"${params.projectName ? ` du projet ${params.projectName}` : ''}`;
      default:
        return 'Vous avez une nouvelle notification';
    }
  };

  // Notifications pour les uploads de fichiers
  const notifyFileUploaded = useCallback(async (
    fileName: string,
    uploaderName: string,
    projectName?: string
  ) => {
    await createAdminNotification(
      'file_uploaded',
      { uploaderName, fileName, projectName },
      { uploaderName, fileName, projectName },
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
      { validatorName, taskName, projectName },
      { validatorName, taskName, projectName },
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
      { senderName, subject },
      { senderName, subject },
      { senderName, subject }
    );
  }, [createNotification]);

  // Notifications pour les demandes de réunion
  const notifyMeetingRequest = useCallback(async (
    meetingTitle: string,
    requesterName: string,
    scheduledTime: string
  ) => {
    const scheduledDate = new Date(scheduledTime).toLocaleDateString();
    await createAdminNotification(
      'meeting_request',
      { meetingTitle, requesterName, scheduledDate },
      { meetingTitle, requesterName, scheduledDate },
      { meetingTitle, requesterName, scheduledTime, scheduledDate }
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
      { taskName, projectName, assignerName },
      { taskName, projectName, assignerName },
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
      { projectName, adminName },
      { projectName, adminName },
      { projectName, adminName }
    );
  }, [createNotification]);

  // Notifications pour tous les membres d'un projet
  const notifyProjectMembers = useCallback(async (
    projectId: string,
    type: NotificationType,
    titleParams: Record<string, any> = {},
    messageParams: Record<string, any> = {},
    data: Record<string, any> = {}
  ) => {
    try {
      // Récupérer tous les membres du projet
      const { data: members, error: membersError } = await supabase
        .from('membre')
        .select('user_id')
        .eq('project_id', projectId);

      if (membersError) throw membersError;

      // Créer une notification pour chaque membre
      const notificationPromises = members?.map(member => 
        createNotification(member.user_id, type, titleParams, messageParams, data)
      ) || [];

      await Promise.all(notificationPromises);
    } catch (error) {
      console.error('Erreur lors de la création de notifications pour les membres du projet:', error);
    }
  }, [createNotification]);

  // Notifications pour les changements de statut de tâche
  const notifyTaskStatusChange = useCallback(async (
    projectId: string,
    taskName: string,
    newStatus: string,
    userName: string,
    projectName?: string
  ) => {
    const statusLabels = {
      'in_progress': 'démarrée',
      'submitted': 'soumise pour validation',
      'validated': 'validée',
      'rejected': 'rejetée'
    };

    const statusLabel = statusLabels[newStatus as keyof typeof statusLabels] || newStatus;

    // Notifier tous les membres du projet
    await notifyProjectMembers(
      projectId,
      'task_status_changed',
      { taskName, statusLabel, userName, projectName },
      { taskName, statusLabel, userName, projectName },
      { taskName, newStatus, userName, projectName }
    );

    // Notifier aussi l'admin
    await createAdminNotification(
      'task_status_changed',
      { taskName, statusLabel, userName, projectName },
      { taskName, statusLabel, userName, projectName },
      { taskName, newStatus, userName, projectName }
    );
  }, [notifyProjectMembers, createAdminNotification]);

  // Notifications pour les fichiers uploadés
  const notifyFileUploadedToProject = useCallback(async (
    projectId: string,
    fileName: string,
    uploaderName: string,
    taskName: string,
    projectName?: string
  ) => {
    // Notifier tous les membres du projet
    await notifyProjectMembers(
      projectId,
      'file_uploaded',
      { fileName, uploaderName, taskName, projectName },
      { fileName, uploaderName, taskName, projectName },
      { fileName, uploaderName, taskName, projectName }
    );

    // Notifier aussi l'admin
    await createAdminNotification(
      'file_uploaded',
      { fileName, uploaderName, taskName, projectName },
      { fileName, uploaderName, taskName, projectName },
      { fileName, uploaderName, taskName, projectName }
    );
  }, [notifyProjectMembers, createAdminNotification]);

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
      { taskName, intervenantName, projectName },
      { taskName, intervenantName, projectName },
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
      { fileName, uploaderName, projectName },
      { fileName, uploaderName, projectName },
      { fileName, uploaderName, projectName }
    );
  }, [createNotification]);

  // Notifications pour les réponses aux demandes de réunion
  const notifyMeetingRequestResponse = useCallback(async (
    requesterId: string,
    meetingTitle: string,
    approved: boolean,
    adminName?: string,
    responseMessage?: string
  ) => {
    await createNotification(
      requesterId,
      approved ? 'meeting_request_approved' : 'meeting_request_rejected',
      { meetingTitle, adminName, responseMessage },
      { meetingTitle, adminName, responseMessage },
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
    const scheduledDate = new Date(scheduledTime).toLocaleDateString();
    await createNotification(
      participantId,
      'meeting_invitation',
      { meetingTitle, organizerName, scheduledDate },
      { meetingTitle, organizerName, scheduledDate },
      { meetingTitle, organizerName, scheduledTime }
    );
  }, [createNotification]);

  // Notifications pour le démarrage de réunion
  const notifyMeetingStarted = useCallback(async (
    participants: string[],
    meetingTitle: string,
    organizerName: string,
    meetingId: string,
    roomId: string
  ) => {
    // Envoyer la notification à tous les participants
    for (const participantId of participants) {
      await createNotification(
        participantId,
        'meeting_started',
        { meetingTitle, organizerName },
        { meetingTitle, organizerName },
        { meetingTitle, organizerName, meetingId, roomId }
      );
    }
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
    notifyMeetingRequestResponse,
    notifyMeetingInvitation,
    notifyMeetingStarted,
    notifyProjectMembers,
    notifyTaskStatusChange,
    notifyFileUploadedToProject
  };
} 