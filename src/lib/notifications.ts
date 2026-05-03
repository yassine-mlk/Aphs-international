import { NotificationType } from '@/hooks/useNotifications';

// On redirige vers l'implémentation unifiée
export { sendNotification, sendBulkNotifications } from './notifications/sendNotification';
export { notifyMemberAdded } from './notifications/projectNotifications';

export interface NotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  data?: Record<string, any>;
  sendEmail?: boolean;
  emailData?: {
    to: string;
    subject: string;
    template: 'task_assigned' | 'task_validated' | 'member_added' | 'message_received' | 'signature_request' | 'signature_confirmed' | 'workflow_status_changed' | 'meeting_request' | 'meeting_accepted' | 'meeting_refused' | 'meeting_reminder';
    variables: Record<string, string>;
  };
}
