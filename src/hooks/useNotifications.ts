import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, any>;
  read: boolean;
  created_at: string;
  updated_at: string;
}

export type NotificationType =
  | 'file_uploaded'
  | 'task_validated'
  | 'new_message'
  | 'document_signed'
  | 'document_rejected'
  | 'task_assigned'
  | 'project_added'
  | 'task_validation_request'
  | 'file_validation_request'
  | 'message_received'
  | 'task_status_changed'
  | 'videoconf_request'
  | 'videoconf_accepted'
  | 'videoconf_rejected'
  | 'videoconf_scheduled';

// Titres des notifications en français
const notificationTitles: Record<NotificationType, string> = {
  file_uploaded: 'Nouveau fichier uploadé',
  task_validated: 'Tâche validée',
  new_message: 'Nouveau message',
  document_signed: 'Document signé',
  document_rejected: 'Document refusé',
  task_assigned: 'Nouvelle tâche assignée',
  project_added: 'Ajouté à un nouveau projet',
  task_validation_request: 'Demande de validation de tâche',
  file_validation_request: 'Fichier à valider',
  message_received: 'Message reçu',
  task_status_changed: 'Statut de tâche modifié',
  videoconf_request: 'Demande de visioconférence',
  videoconf_accepted: 'Réunion acceptée',
  videoconf_rejected: 'Réunion refusée',
  videoconf_scheduled: 'Réunion programmée'
};

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const channelRef = useRef<any>(null);

  // Charger les notifications
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      setNotifications(data || []);
      setUnreadCount((data || []).filter(n => !n.read).length);
    } catch (error) {
      console.error('Erreur lors du chargement des notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Marquer comme lu
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Erreur lors du marquage comme lu:', error);
    }
  }, []);

  // Marquer tout comme lu
  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;
      
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      
      toast({
        title: 'Notifications marquées comme lues',
        duration: 2000
      });
    } catch (error) {
      console.error('Erreur lors du marquage de tout comme lu:', error);
    }
  }, [user?.id, toast]);

  // Créer une notification
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
          title: title || notificationTitles[type],
          message,
          data,
          read: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.error('Erreur lors de la création de la notification:', error);
    }
  }, []);

  // Écouter les nouvelles notifications en temps réel
  useEffect(() => {
    if (!user?.id) return;

    // Charger les notifications initiales
    fetchNotifications();

    // S'abonner aux nouvelles notifications
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        const newNotification = payload.new as Notification;
        setNotifications(prev => [newNotification, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        // Afficher un toast
        toast({
          title: newNotification.title,
          description: newNotification.message,
          duration: 5000
        });
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id, fetchNotifications, toast]);

  return {
    notifications,
    unreadCount,
    loading,
    isConnected,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    createNotification
  };
}
