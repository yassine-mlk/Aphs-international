import React from 'react';
import { Bell, Check, CheckCheck, Trash2, Clock, FileText, UserPlus, Video, MessageSquare, Target, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useNotifications, Notification, NotificationType } from '@/hooks/useNotifications';
import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from '@/lib/translations';

// Types de notifications importantes à afficher dans la barre
const IMPORTANT_NOTIFICATION_TYPES: NotificationType[] = [
  'task_assigned',
  'task_validation_request',
  'meeting_invitation',
  'meeting_started',
  'meeting_request',
  'file_validation_request',
  'message_received',
  'project_added'
];

// Limite du nombre de notifications à afficher
const MAX_NOTIFICATIONS_DISPLAY = 8;

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'file_uploaded':
    case 'file_validation_request':
      return <FileText className="h-4 w-4 text-blue-500" />;
    case 'task_validated':
    case 'task_assigned':
    case 'task_validation_request':
      return <Target className="h-4 w-4 text-green-500" />;
    case 'new_message':
    case 'message_received':
      return <MessageSquare className="h-4 w-4 text-purple-500" />;
    case 'meeting_request':
    case 'meeting_invitation':
    case 'meeting_started':
    case 'meeting_accepted':
    case 'meeting_declined':
      return <Video className="h-4 w-4 text-orange-500" />;
    case 'project_added':
      return <UserPlus className="h-4 w-4 text-teal-500" />;
    default:
      return <Clock className="h-4 w-4 text-gray-500" />;
  }
};

const getNotificationColor = (type: NotificationType, read: boolean) => {
  if (read) return 'text-gray-500';
  
  switch (type) {
    case 'file_uploaded':
    case 'file_validation_request':
      return 'text-blue-600';
    case 'task_validated':
    case 'task_assigned':
    case 'task_validation_request':
      return 'text-green-600';
    case 'new_message':
    case 'message_received':
      return 'text-purple-600';
    case 'meeting_request':
    case 'meeting_invitation':
    case 'meeting_started':
    case 'meeting_accepted':
    case 'meeting_declined':
      return 'text-orange-600';
    case 'project_added':
      return 'text-teal-600';
    default:
      return 'text-gray-600';
  }
};

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'À l\'instant';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}j`;
  
  return date.toLocaleDateString('fr-FR', { 
    day: 'numeric', 
    month: 'short' 
  });
};

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  onDelete
}) => {
  return (
    <div
      className={cn(
        "flex items-start space-x-3 p-3 hover:bg-gray-50 transition-colors relative group",
        !notification.read && "bg-blue-50/50"
      )}
    >
      <div className="flex-shrink-0 mt-1">
        {getNotificationIcon(notification.type)}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className={cn(
              "text-sm font-medium",
              getNotificationColor(notification.type, notification.read)
            )}>
              {notification.title}
            </p>
            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
              {notification.message}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {formatTimeAgo(notification.created_at)}
            </p>
          </div>
          
          {!notification.read && (
            <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 mt-1"></div>
          )}
        </div>
      </div>
      
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
        {!notification.read && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onMarkAsRead(notification.id);
            }}
            title="Marquer comme lu"
          >
            <Check className="h-3 w-3" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(notification.id);
          }}
          title="Supprimer"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};

const NotificationBell: React.FC = () => {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotifications();

  const { language } = useLanguage();
  const t = translations[language as keyof typeof translations];

  // Filtrer les notifications pour n'afficher que les importantes
  const filteredNotifications = notifications
    .filter(notification => IMPORTANT_NOTIFICATION_TYPES.includes(notification.type))
    .slice(0, MAX_NOTIFICATIONS_DISPLAY);

  // Compter seulement les notifications importantes non lues
  const importantUnreadCount = notifications
    .filter(notification => 
      IMPORTANT_NOTIFICATION_TYPES.includes(notification.type) && 
      !notification.read
    ).length;

  // Vérifier s'il y a d'autres notifications non affichées
  const hasMoreNotifications = notifications.length > filteredNotifications.length;
  const hiddenNotificationsCount = notifications.length - filteredNotifications.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative h-8 w-8 rounded-full hover:bg-gray-100"
        >
          <Bell className={cn(
            "h-4 w-4 transition-colors",
            importantUnreadCount > 0 ? "text-blue-600" : "text-gray-600"
          )} />
          {importantUnreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs font-bold border-2 border-white shadow-sm animate-pulse"
            >
              {importantUnreadCount > 99 ? '99+' : importantUnreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-80 p-0"
        sideOffset={5}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <DropdownMenuLabel className="p-0 font-semibold">
            {t.notifications?.common?.notifications || 'Notifications'}
            {importantUnreadCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {importantUnreadCount}
              </Badge>
            )}
          </DropdownMenuLabel>
          
          <div className="flex items-center gap-2">
            {hasMoreNotifications && (
              <div className="flex items-center text-xs text-gray-500">
                <Filter className="h-3 w-3 mr-1" />
                <span>Principales</span>
              </div>
            )}
            
            {importantUnreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={markAllAsRead}
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                {t.notifications?.common?.markAllRead || 'Tout marquer'}
              </Button>
            )}
          </div>
        </div>
        
        {loading ? (
          <div className="p-4 text-center text-sm text-gray-500">
            {t.notifications?.common?.loading || t.common?.loading || 'Chargement...'}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p>{t.notifications?.common?.noNotifications || 'Aucune notification importante'}</p>
            {hasMoreNotifications && (
              <p className="text-xs text-gray-400 mt-1">
                {hiddenNotificationsCount} autres notifications masquées
              </p>
            )}
          </div>
        ) : (
          <ScrollArea className="max-h-96">
            <div className="divide-y">
              {filteredNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  onDelete={deleteNotification}
                />
              ))}
              
              {hasMoreNotifications && (
                <div className="p-3 text-center border-t bg-gray-50">
                  <p className="text-xs text-gray-500">
                    {hiddenNotificationsCount} autres notifications
                  </p>
                  <p className="text-xs text-gray-400">
                    Consultez l'activité récente pour voir toutes les notifications
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
        
        {filteredNotifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button 
                variant="ghost" 
                className="w-full text-xs h-8"
                onClick={() => {/* Navigate to notifications page */}}
              >
                {t.notifications?.common?.viewAll || 'Voir l\'activité récente'}
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationBell; 