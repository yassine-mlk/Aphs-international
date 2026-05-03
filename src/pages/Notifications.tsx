import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Clock, 
  FileText, 
  UserPlus, 
  Video, 
  MessageSquare, 
  Target, 
  Search,
  Filter,
  ArrowRight,
  MoreVertical,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { TaskListSkeleton } from '@/components/Skeletons';

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'file_uploaded':
    case 'file_submitted':
    case 'all_submitted':
    case 'file_validation_request':
      return <FileText className="h-6 w-6 text-blue-500" />;
    case 'task_validated':
    case 'task_assigned':
    case 'task_validator_assigned':
    case 'task_closed':
    case 'task_validation_request':
    case 'workflow_submission':
    case 'validator_turn':
      return <Target className="h-6 w-6 text-green-500" />;
    case 'review_submitted':
    case 'ready_for_decision':
    case 'task_relaunched':
      return <Clock className="h-6 w-6 text-amber-500" />;
    case 'new_message':
    case 'message_received':
      return <MessageSquare className="h-6 w-6 text-purple-500" />;
    case 'project_added':
      return <UserPlus className="h-6 w-6 text-teal-500" />;
    case 'document_signed':
    case 'document_approved':
    case 'visa_vso':
      return <FileText className="h-6 w-6 text-green-500" />;
    case 'document_rejected':
    case 'visa_revision_required':
      return <FileText className="h-6 w-6 text-red-500" />;
    default:
      return <Bell className="h-6 w-6 text-gray-500" />;
  }
};

const formatFullDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', { 
    weekday: 'long',
    day: 'numeric', 
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const { notifications, loading, markAsRead, markAllAsRead } = useNotifications();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

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
        case 'task_validator_assigned':
        case 'task_closed':
        case 'task_relaunched':
        case 'file_submitted':
        case 'all_submitted':
        case 'review_submitted':
        case 'ready_for_decision':
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

  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      if (filter === 'unread') return !n.is_read;
      if (filter === 'read') return n.is_read;
      return true;
    });
  }, [notifications, filter]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.is_read).length;
  }, [notifications]);

  const currentNotifications = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredNotifications.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredNotifications, currentPage]);

  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);

  return (
    <div className="container mx-auto py-8 max-w-4xl px-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Notifications</h1>
          <p className="text-gray-500">
            Vous avez {unreadCount} notification{unreadCount > 1 ? 's' : ''} non lue{unreadCount > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={markAllAsRead}
              className="text-gray-600 hover:text-blue-600 border-gray-200"
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Tout marquer comme lu
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <div className="flex items-center gap-1 bg-gray-100/50 p-1 rounded-xl border border-gray-100">
          <Button
            variant={filter === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('all')}
            className={cn("text-xs h-9 px-4", filter === 'all' ? "bg-blue-600" : "text-gray-500")}
          >
            Toutes
          </Button>
          <Button
            variant={filter === 'unread' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('unread')}
            className={cn("text-xs h-9 px-4", filter === 'unread' ? "bg-blue-600" : "text-gray-500")}
          >
            Non lues
          </Button>
          <Button
            variant={filter === 'read' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('read')}
            className={cn("text-xs h-9 px-4", filter === 'read' ? "bg-blue-600" : "text-gray-500")}
          >
            Lues
          </Button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        {loading ? (
          <TaskListSkeleton />
        ) : currentNotifications.length > 0 ? (
          <>
            <div className="grid gap-3">
              {currentNotifications.map((notification) => (
                <div 
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    "group flex items-start gap-4 p-5 bg-white border border-gray-100 rounded-2xl hover:border-blue-500 hover:shadow-md transition-all cursor-pointer relative overflow-hidden",
                    !notification.is_read && "border-l-4 border-l-blue-600 bg-blue-50/20"
                  )}
                >
                  {/* Icon */}
                  <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-gray-50 group-hover:bg-blue-50 transition-colors">
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className={cn(
                        "text-base font-semibold transition-colors truncate",
                        !notification.is_read ? "text-gray-900" : "text-gray-600"
                      )}>
                        {notification.title}
                      </h3>
                      {!notification.is_read && (
                        <Badge className="bg-blue-600 h-2 w-2 p-0 rounded-full shrink-0" />
                      )}
                    </div>
                    <p className={cn(
                      "text-sm line-clamp-2",
                      !notification.is_read ? "text-gray-700" : "text-gray-500"
                    )}>
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                      <Clock className="h-3 w-3" />
                      <span>{formatFullDate(notification.created_at)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!notification.is_read && (
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}>
                            <Check className="h-4 w-4 mr-2" />
                            Marquer comme lu
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination UI */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 pt-6 mt-4">
                <div className="text-sm text-gray-500">
                  Affichage de <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> à <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredNotifications.length)}</span> sur <span className="font-medium">{filteredNotifications.length}</span> notifications
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="h-9 w-9 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => {
                        // Show first, last, current, and pages around current
                        return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
                      })
                      .map((page, index, array) => {
                        const showEllipsis = index > 0 && page - array[index - 1] > 1;
                        return (
                          <React.Fragment key={page}>
                            {showEllipsis && <span className="text-gray-400 px-1">...</span>}
                            <Button
                              variant={currentPage === page ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                              className={cn(
                                "h-9 w-9 p-0",
                                currentPage === page ? "bg-blue-600 border-blue-600" : "text-gray-600 border-gray-200"
                              )}
                            >
                              {page}
                            </Button>
                          </React.Fragment>
                        );
                      })
                    }
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="h-9 w-9 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50 border-2 border-dashed border-gray-200 rounded-2xl text-center">
            <div className="p-4 bg-white rounded-full shadow-sm mb-4">
              <Bell className="h-10 w-10 text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Aucune notification</h3>
            <p className="text-sm text-gray-500 max-w-xs mt-1">
              Vous n'avez aucune notification correspondant à vos filtres.
            </p>
            {(searchTerm || filter !== 'all') && (
              <Button 
                variant="outline" 
                size="sm"
                className="mt-6"
                onClick={() => {
                  setSearchTerm('');
                  setFilter('all');
                }}
              >
                Réinitialiser les filtres
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
