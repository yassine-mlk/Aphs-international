import React from 'react';
import { Bell, Check, CheckCheck, Trash2, Clock, FileText, UserPlus, Video, MessageSquare, Target, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
import { useNotifications, Notification } from '@/hooks/useNotifications';

// Types de notifications importantes à afficher dans la barre
const IMPORTANT_NOTIFICATION_TYPES: string[] = [
  'task_assigned',
  'task_validator_assigned',
  'file_submitted',
  'all_submitted',
  'review_submitted',
  'ready_for_decision',
  'task_closed',
  'task_relaunched',
  'task_validation_request',
  'file_validation_request',
  'message_received',
  'project_added',
  'document_signed',
  'document_rejected',
  'workflow_submission',
  'workflow_submission_admin',
  'task_status_changed',
  'task_validated',
  'validator_turn',
  'visa_vso',
  'visa_vso_admin',
  'visa_var',
  'visa_vao',
  'visa_result_admin',
  'visa_revision_required',
  'meeting_request',
  'meeting_accepted',
  'meeting_refused',
  'meeting_reminder'
];

// Limite du nombre de notifications à afficher
const MAX_NOTIFICATIONS_DISPLAY = 3;

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'file_uploaded':
    case 'file_submitted':
    case 'all_submitted':
    case 'file_validation_request':
      return <FileText className="h-4 w-4 text-blue-500" />;
    case 'task_validated':
    case 'task_assigned':
    case 'task_validator_assigned':
    case 'task_closed':
    case 'task_validation_request':
    case 'workflow_submission':
    case 'workflow_submission_admin':
    case 'validator_turn':
      return <Target className="h-4 w-4 text-green-500" />;
    case 'review_submitted':
    case 'ready_for_decision':
    case 'task_relaunched':
      return <Clock className="h-4 w-4 text-amber-500" />;
    case 'new_message':
    case 'message_received':
      return <MessageSquare className="h-4 w-4 text-purple-500" />;
    case 'project_added':
      return <UserPlus className="h-4 w-4 text-teal-500" />;
    case 'document_signed':
    case 'document_approved':
    case 'visa_vso':
    case 'visa_vso_admin':
      return <FileText className="h-4 w-4 text-green-500" />;
    case 'document_rejected':
    case 'visa_revision_required':
    case 'visa_var':
    case 'visa_vao':
    case 'visa_result_admin':
      return <FileText className="h-4 w-4 text-red-500" />;
    case 'meeting_request':
    case 'meeting_accepted':
    case 'meeting_refused':
    case 'meeting_reminder':
      return <Video className="h-4 w-4 text-orange-500" />;
    default:
      return <Clock className="h-4 w-4 text-gray-500" />;
  }
};

const getNotificationColor = (type: string, isRead: boolean) => {
  if (isRead) return "text-gray-500";
  
  switch (type) {
    case 'task_assigned':
    case 'task_validation_request':
    case 'task_status_changed':
    case 'task_validated':
    case 'workflow_submission':
    case 'workflow_submission_admin':
    case 'validator_turn':
      return "text-green-700";
    case 'message_received':
      return "text-purple-700";
    case 'visa_revision_required':
    case 'visa_var':
    case 'visa_vao':
    case 'visa_result_admin':
      return "text-red-700";
    case 'meeting_request':
    case 'meeting_accepted':
    case 'meeting_refused':
    case 'meeting_reminder':
      return "text-orange-700";
    default:
      return "text-blue-700";
  }
};

const formatTimeAgo = (dateString: string) => {
  if (!dateString) return 'Récemment';
  const date = new Date(dateString);
  const now = new Date();
  
  // Vérifier si la date est valide
  if (isNaN(date.getTime())) return 'Récemment';
  
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
  onClick: (notification: Notification) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  onClick
}) => {
  return (
    <div
      onClick={() => onClick(notification)}
      className={cn(
        "flex items-start space-x-3 p-3 hover:bg-gray-50 transition-colors relative group cursor-pointer",
        !notification.is_read && "bg-blue-50/50"
      )}
    >
      <div className="flex-shrink-0 mt-1">
        {getNotificationIcon(notification.type as any)}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className={cn(
              "text-sm font-medium",
              getNotificationColor(notification.type as any, notification.is_read)
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
          
          {!notification.is_read && (
            <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 mt-1"></div>
          )}
        </div>
      </div>
      
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
        {!notification.is_read && (
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
      </div>
    </div>
  );
};

const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    if (notification.link) {
      navigate(notification.link);
    } else {
      // Fallback si pas de lien direct
      const { type } = notification;
      switch (type) {
        case 'new_message':
        case 'message_received':
          navigate('/dashboard/messages');
          break;
        case 'task_assigned':
        case 'task_validation_request':
        case 'task_validated':
        case 'task_status_changed':
        case 'workflow_submission':
        case 'workflow_submission_admin':
        case 'validator_turn':
        case 'visa_vso':
        case 'visa_vso_admin':
        case 'visa_var':
        case 'visa_vao':
        case 'visa_result_admin':
          navigate('/dashboard/tasks');
          break;
        case 'project_added':
          navigate('/dashboard/projets');
          break;
        case 'videoconf_request':
        case 'videoconf_scheduled':
        case 'videoconf_accepted':
        case 'meeting_request':
          navigate('/dashboard/videoconference?tab=pending');
          break;
        case 'meeting_accepted':
        case 'meeting_refused':
        case 'meeting_reminder':
          navigate('/dashboard/videoconference');
          break;
        default:
          break;
      }
    }
  };

  // Filtrer pour n'afficher que les notifications importantes dans la cloche
  const filteredNotifications = notifications
    .filter(n => IMPORTANT_NOTIFICATION_TYPES.includes(n.type))
    .slice(0, MAX_NOTIFICATIONS_DISPLAY);

  // Compter toutes les notifications non lues importantes
  const totalUnreadCount = notifications.filter(n => !n.is_read && IMPORTANT_NOTIFICATION_TYPES.includes(n.type)).length;

  // Vérifier s'il y a d'autres notifications non affichées
  const hasMoreNotifications = notifications.filter(n => IMPORTANT_NOTIFICATION_TYPES.includes(n.type)).length > filteredNotifications.length;
  const hiddenNotificationsCount = notifications.filter(n => IMPORTANT_NOTIFICATION_TYPES.includes(n.type)).length - filteredNotifications.length;

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
            totalUnreadCount > 0 ? "text-blue-600" : "text-gray-600"
          )} />
          {totalUnreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs font-bold border-2 border-white shadow-sm animate-pulse"
            >
              {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
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
            Notifications
            {totalUnreadCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {totalUnreadCount}
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
            
            {totalUnreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={markAllAsRead}
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Tout marquer comme lu
              </Button>
            )}
          </div>
        </div>
        
        {filteredNotifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-500">
            <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p>Aucune notification</p>
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
                  onClick={handleNotificationClick}
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
                onClick={() => navigate('/dashboard/notifications')}
              >
                Voir tout
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationBell; 