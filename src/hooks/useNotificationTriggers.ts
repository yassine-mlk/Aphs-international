import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import { sendNotification, sendBulkNotifications, getTenantAdmins } from '@/lib/notifications/sendNotification';

/**
 * Hook de compatibilité pour déclencher des notifications
 * Redirige maintenant vers le nouveau système sendNotification
 */
export function useNotificationTriggers() {
  const { tenant } = useTenant();
  const { user, status } = useAuth();
  
  const createNotification = useCallback(async (
    userId: string,
    type: string,
    title: string,
    message: string,
    link?: string
  ) => {
    if (status !== 'authenticated') return;
    await sendNotification({
      userId,
      type,
      title,
      message,
      link
    });
  }, [status]);

  const createAdminNotification = useCallback(async (
    type: string,
    title: string,
    message: string,
    link?: string,
    tenantId?: string
  ) => {
    if (status !== 'authenticated') return;
    const effectiveTenantId = tenantId || tenant?.id;
    if (!effectiveTenantId) return;

    const adminIds = await getTenantAdmins(effectiveTenantId);
    await sendBulkNotifications(adminIds.map(userId => ({
      userId,
      type,
      title,
      message,
      link
    })));
  }, [status, tenant?.id]);

  const notifyTaskAssigned = useCallback(async (userId: string, taskName: string, projectName: string, assignerName: string) => {
    await sendNotification({
      userId,
      type: 'task_assigned',
      title: 'Nouvelle tâche assignée',
      message: `Vous avez été assigné à la tâche "${taskName}" dans le projet "${projectName}" par ${assignerName}.`,
      link: '/dashboard/tasks',
      sendEmail: true,
      emailData: {
        to: '',
        subject: `Nouvelle tâche: ${taskName}`,
        template: 'task_assigned',
        variables: { taskName, projectName, assignedByName: assignerName, appUrl: window.location.origin }
      }
    });
  }, []);

  const notifyFileUploaded = useCallback(async (fileName: string, uploaderName: string, projectName: string) => {
    if (!tenant?.id) return;
    const adminIds = await getTenantAdmins(tenant.id);
    await sendBulkNotifications(adminIds.map(userId => ({
      userId,
      type: 'file_uploaded',
      title: 'Nouveau fichier disponible',
      message: `${uploaderName} a ajouté "${fileName}" au projet "${projectName}".`,
      link: '/dashboard/projets'
    })));
  }, [tenant?.id]);

  const notifyTaskValidated = useCallback(async (taskName: string, validatorName: string, projectName: string) => {
    // On notifie les admins et potentiellement l'exécuteur (mais ici on simplifie)
    if (!tenant?.id) return;
    const adminIds = await getTenantAdmins(tenant.id);
    await sendBulkNotifications(adminIds.map(userId => ({
      userId,
      type: 'task_validated',
      title: 'Tâche validée',
      message: `La tâche "${taskName}" du projet "${projectName}" a été validée par ${validatorName}.`,
      link: '/dashboard/tasks'
    })));
  }, [tenant?.id]);

  const notifyProjectAdded = useCallback(async (userId: string, projectName: string, adminName: string) => {
    await sendNotification({
      userId,
      type: 'project_added',
      title: 'Nouveau projet',
      message: `Vous avez été ajouté au projet "${projectName}" par ${adminName}.`,
      link: '/dashboard/projets',
      sendEmail: true,
      emailData: {
        to: '',
        subject: `Bienvenue dans le projet ${projectName}`,
        template: 'member_added',
        variables: { projectName, addedByName: adminName, role: 'Intervenant', appUrl: window.location.origin }
      }
    });
  }, []);

  const notifyNewMessage = useCallback(async (userId: string, senderName: string, subject: string) => {
    await sendNotification({
      userId,
      type: 'message_received',
      title: 'Nouveau message',
      message: `Vous avez reçu un message de ${senderName}: "${subject}"`,
      link: '/dashboard/messages',
      sendEmail: true,
      emailData: {
        to: '',
        subject: `Nouveau message de ${senderName}`,
        template: 'message_received',
        variables: { senderName, messagePreview: subject, appUrl: window.location.origin }
      }
    });
  }, []);

  const notifyTaskValidationRequest = useCallback(async (taskName: string, projectName: string, requesterName: string) => {
    if (!tenant?.id) return;
    const adminIds = await getTenantAdmins(tenant.id);
    await sendBulkNotifications(adminIds.map(userId => ({
      userId,
      type: 'task_validation_request',
      title: 'Demande de validation',
      message: `${requesterName} demande la validation de la tâche "${taskName}" (Projet: ${projectName}).`,
      link: '/dashboard/tasks'
    })));
  }, [tenant?.id]);

  const notifyFileValidationRequest = useCallback(async (fileName: string, projectName: string, requesterName: string) => {
    if (!tenant?.id) return;
    const adminIds = await getTenantAdmins(tenant.id);
    await sendBulkNotifications(adminIds.map(userId => ({
      userId,
      type: 'file_validation_request',
      title: 'Validation de fichier requise',
      message: `${requesterName} demande la validation du fichier "${fileName}" (Projet: ${projectName}).`,
      link: '/dashboard/projets'
    })));
  }, [tenant?.id]);

  const notifyTaskStatusChange = useCallback(async (taskName: string, newStatus: string, actorName: string) => {
    if (!tenant?.id) return;
    const adminIds = await getTenantAdmins(tenant.id);
    await sendBulkNotifications(adminIds.map(userId => ({
      userId,
      type: 'task_status_changed',
      title: 'Changement de statut',
      message: `${actorName} a passé la tâche "${taskName}" au statut "${newStatus}".`,
      link: '/dashboard/tasks'
    })));
  }, [tenant?.id]);

  const notifyFileUploadedToProject = useCallback(async (fileName: string, projectName: string, uploaderName: string) => {
    if (!tenant?.id) return;
    const adminIds = await getTenantAdmins(tenant.id);
    await sendBulkNotifications(adminIds.map(userId => ({
      userId,
      type: 'file_uploaded',
      title: 'Nouveau document projet',
      message: `${uploaderName} a uploadé "${fileName}" dans le projet "${projectName}".`,
      link: '/dashboard/projets'
    })));
  }, [tenant?.id]);

  return { 
    createNotification, 
    createAdminNotification,
    notifyTaskAssigned,
    notifyFileUploaded,
    notifyTaskValidated,
    notifyProjectAdded,
    notifyNewMessage,
    notifyTaskValidationRequest,
    notifyFileValidationRequest,
    notifyTaskStatusChange,
    notifyFileUploadedToProject
  };
}
