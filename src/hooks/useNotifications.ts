import { useNotificationContext } from '@/contexts/NotificationContext';

export type { Notification } from '@/contexts/NotificationContext';

export function useNotifications() {
  const context = useNotificationContext();
  
  return {
    notifications: context.notifications,
    unreadCount: context.unreadCount,
    loading: context.loading,
    fetchNotifications: context.fetchNotifications,
    markAsRead: context.markAsRead,
    markAllAsRead: context.markAllAsRead
  };
}
