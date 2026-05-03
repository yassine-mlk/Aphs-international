import React from 'react';
import { Bell, Check, CheckCheck, Clock, FileText, UserPlus, Video, MessageSquare, Target, ArrowRight } from 'lucide-react';
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
      return <Bell className="h-4 w-4 text-gray-500" />;
  }
};

const formatTimeAgo = (dateString: string) => {
  if (!dateString) return 'Récemment';
  const date = new Date(dateString);
  const now = new Date();
  if (isNaN(date.getTime())) return 'Récemment';
  
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return 'À l\'instant';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}j`;
  
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
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
        default:
          break;
      }
    }
  };

  // Afficher les 3 dernières notifications (toutes catégories confondues pour harmoniser)
  const recentNotifications = notifications.slice(0, 3);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 rounded-2xl bg-gray-50 p-0 hover:bg-blue-50 group transition-all"
        >
          <Bell className={cn(
            "h-5 w-5 transition-colors",
            unreadCount > 0 ? "text-blue-600" : "text-gray-400 group-hover:text-blue-600"
          )} />
          {unreadCount > 0 && (
            <span className="absolute top-2.5 right-2.5 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-white animate-pulse" />
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-80 p-0 rounded-2xl shadow-xl border-gray-100 overflow-hidden"
        sideOffset={8}
      >
        <div className="flex items-center justify-between p-4 bg-white border-b border-gray-50">
          <DropdownMenuLabel className="p-0 text-sm font-black text-gray-900 uppercase tracking-tight">
            Notifications
          </DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[10px] font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 rounded-lg uppercase tracking-wider"
              onClick={(e) => {
                e.stopPropagation();
                markAllAsRead();
              }}
            >
              Tout marquer lu
            </Button>
          )}
        </div>
        
        <div className="divide-y divide-gray-50">
          {recentNotifications.length === 0 ? (
            <div className="p-8 text-center">
              <div className="h-12 w-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <Bell className="h-6 w-6 text-gray-300" />
              </div>
              <p className="text-sm font-bold text-gray-900">Tout est à jour !</p>
              <p className="text-xs text-gray-500 mt-1">Aucune nouvelle notification pour le moment.</p>
            </div>
          ) : (
            recentNotifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={cn(
                  "flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors cursor-pointer relative",
                  !notification.is_read && "bg-blue-50/30"
                )}
              >
                <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-gray-100 shadow-sm mt-0.5">
                  {getNotificationIcon(notification.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <p className={cn(
                      "text-xs font-black truncate",
                      !notification.is_read ? "text-gray-900" : "text-gray-500"
                    )}>
                      {notification.title}
                    </p>
                    <span className="text-[10px] font-medium text-gray-400 shrink-0">
                      {formatTimeAgo(notification.created_at)}
                    </span>
                  </div>
                  <p className={cn(
                    "text-[11px] line-clamp-2 leading-relaxed",
                    !notification.is_read ? "text-gray-700 font-medium" : "text-gray-400"
                  )}>
                    {notification.message}
                  </p>
                </div>
                
                {!notification.is_read && (
                  <div className="absolute top-4 right-2 w-1.5 h-1.5 bg-blue-600 rounded-full" />
                )}
              </div>
            ))
          )}
        </div>
        
        <div className="p-2 bg-gray-50/50 border-t border-gray-100">
          <Button 
            variant="ghost" 
            className="w-full text-[11px] font-black text-gray-500 hover:text-blue-600 hover:bg-white h-9 rounded-xl transition-all group"
            onClick={() => navigate('/dashboard/notifications')}
          >
            Voir toutes les notifications
            <ArrowRight className="h-3 w-3 ml-2 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationBell; 