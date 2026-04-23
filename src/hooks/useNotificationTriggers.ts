import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { NotificationType } from '@/hooks/useNotifications';
import { useTenant } from '@/contexts/TenantContext';

export function useNotificationTriggers() {
  const { tenant } = useTenant();
  
  // Créer une notification pour un utilisateur spécifique avec paramètres
  const createNotification = useCallback(async (
    userId: string,
    type: NotificationType,
    titleParams: Record<string, any> = {},
    messageParams: Record<string, any> = {},
    data: Record<string, any> = {}
  ) => {
    try {
      const defaultTitle = getDefaultTitle(type, titleParams);
      const defaultMessage = getDefaultMessage(type, messageParams);

      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type,
          title: defaultTitle,
          message: defaultMessage,
          title_key: type,
          message_key: type,
          title_params: titleParams,
          message_params: messageParams,
          data,
          tenant_id: tenant?.id // Ajout du tenant_id si disponible
        });

      if (error) throw error;
    } catch (error) {
      console.error("Error creating notification:", error);
    }
  }, [tenant?.id]);

  // Créer une notification pour tous les admins d'un tenant
  const createAdminNotification = useCallback(async (
    type: NotificationType,
    titleParams: Record<string, any> = {},
    messageParams: Record<string, any> = {},
    data: Record<string, any> = {},
    tenantId?: string
  ) => {
    try {
      // Récupérer tous les admins (filtrer par tenant si spécifié)
      let query = supabase
        .from('profiles')
        .select('user_id')
        .eq('role', 'admin');
      
      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data: admins, error: adminsError } = await query;

      if (adminsError) throw adminsError;

      // Créer une notification pour chaque admin
      const notificationPromises = admins?.map(admin => 
        createNotification(admin.user_id, type, titleParams, messageParams, data)
      ) || [];

      await Promise.all(notificationPromises);
    } catch (error) {
      console.error("Error creating admin notification:", error);
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
      case 'task_assigned':
        return 'Nouvelle tâche assignée';
      case 'project_added':
        return 'Ajouté à un nouveau projet';
      case 'task_validation_request':
        return 'Demande de validation de tâche';
      case 'file_validation_request':
        return 'Fichier à valider';
      case 'task_status_changed':
        return 'Statut de tâche modifié';
      case 'videoconf_request':
        return 'Demande de visioconférence';
      case 'videoconf_accepted':
        return 'Réunion acceptée';
      case 'videoconf_rejected':
        return 'Réunion refusée';
      case 'videoconf_scheduled':
        return 'Réunion programmée';
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
      case 'task_assigned':
        return `Une nouvelle tâche "${params.taskName || 'tâche'}" vous a été assignée${params.projectName ? ` pour le projet ${params.projectName}` : ''}${params.assignerName ? ` par ${params.assignerName}` : ''}`;
      case 'project_added':
        return `Vous avez été ajouté au projet "${params.projectName || 'projet'}"${params.adminName ? ` par ${params.adminName}` : ''}`;
      case 'task_validation_request':
        return `${params.intervenantName || 'Un intervenant'} demande la validation de la tâche "${params.taskName || 'tâche'}"${params.projectName ? ` du projet ${params.projectName}` : ''}`;
      case 'file_validation_request':
        return `${params.uploaderName || 'Un utilisateur'} a uploadé le fichier "${params.fileName || 'fichier'}" qui nécessite votre validation${params.projectName ? ` pour le projet ${params.projectName}` : ''}`;
      case 'task_status_changed':
        return `${params.userName || 'Un utilisateur'} a ${params.statusLabel || 'modifié'} la tâche "${params.taskName || 'tâche'}"${params.projectName ? ` du projet ${params.projectName}` : ''}`;
      case 'videoconf_request':
        return `${params.intervenantName || 'Un intervenant'} demande une réunion : "${params.title || 'Sans titre'}"`;
      case 'videoconf_accepted':
        return `Votre demande de réunion "${params.title || 'Sans titre'}" a été acceptée par l'administrateur.`;
      case 'videoconf_rejected':
        return `Votre demande de réunion "${params.title || 'Sans titre'}" a été refusée.`;
      case 'videoconf_scheduled':
        return `Vous êtes invité à la réunion "${params.title || 'Sans titre'}" prévue le ${params.date || 'bientôt'}.`;
      default:
        return 'Vous avez reçu une nouvelle notification';
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

  return {
    createNotification,
    createAdminNotification,
    notifyFileUploaded,
    notifyTaskValidated,
    notifyNewMessage,
    notifyTaskAssigned,
    notifyProjectAdded,
    notifyTaskValidationRequest,
    notifyFileValidationRequest,
    notifyProjectMembers,
    notifyTaskStatusChange,
    notifyFileUploadedToProject
  };
} 