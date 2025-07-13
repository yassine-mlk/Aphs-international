import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from '@/lib/translations';

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
  // Nouveaux champs pour les traductions
  title_key?: string;
  message_key?: string;
  title_params?: Record<string, any>;
  message_params?: Record<string, any>;
}

export type NotificationType =
  // Pour les admins
  | 'file_uploaded'
  | 'task_validated'
  | 'new_message'
  | 'meeting_request'
  // Pour les intervenants
  | 'task_assigned'
  | 'project_added'
  | 'task_validation_request'
  | 'file_validation_request'
  | 'message_received'
  | 'meeting_invitation'
  | 'meeting_accepted'
  | 'meeting_declined'
  | 'meeting_request_approved'
  | 'meeting_request_rejected'
  | 'meeting_started';

// Fonction utilitaire pour formater les messages avec paramètres
const formatMessage = (template: string, params: Record<string, any> = {}): string => {
  if (!template) return '';
  
  return template.replace(/\{(\w+)(?:,\s*select,\s*([^}]+))?\}/g, (match, key, selectClause) => {
    const value = params[key];
    
    if (selectClause) {
      // Gérer les conditions select (ex: {projectName, select, undefined {} other {text}})
      const selectOptions = selectClause.split(' other ');
      if (selectOptions.length === 2) {
        const [undefinedOption, otherOption] = selectOptions;
        if (value === undefined || value === null || value === '') {
          return undefinedOption.replace(/[{}]/g, '');
        } else {
          return otherOption.replace(/[{}]/g, '').replace(/\{(\w+)\}/g, (m, k) => params[k] || '');
        }
      }
    }
    
    return value !== undefined ? String(value) : '';
  });
};

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const { language } = useLanguage();
  const channelRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const lastFetchRef = useRef<number>(0);

  // Obtenir les traductions pour la langue actuelle
  const getTranslations = useCallback(() => {
    return translations[language as keyof typeof translations];
  }, [language]);

  // Traduire une notification selon la langue actuelle
  const translateNotification = useCallback((notification: Notification): Notification => {
    const t = getTranslations();
    
    // Si la notification a des clés de traduction, les utiliser
    if (notification.title_key && notification.message_key) {
      const titleTemplate = t.notifications.types[notification.type]?.title || notification.title;
      const messageTemplate = t.notifications.types[notification.type]?.message || notification.message;
      
      return {
        ...notification,
        title: formatMessage(titleTemplate, notification.title_params || {}),
        message: formatMessage(messageTemplate, notification.message_params || {})
      };
    }
    
    // Sinon, utiliser les textes existants
    return notification;
  }, [getTranslations]);

  // Jouer un son de notification (simplifié)
  const playNotificationSound = useCallback(() => {
    try {
      // Son simple et moins gourmand
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      // Ignorer silencieusement
    }
  }, []);

  // Récupérer les notifications avec cache et debounce
  const fetchNotifications = useCallback(async (force = false) => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    // Éviter les requêtes trop fréquentes (max 1 par seconde)
    const now = Date.now();
    if (!force && now - lastFetchRef.current < 1000) {
      return;
    }
    lastFetchRef.current = now;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20); // Réduire la limite pour améliorer les performances

      if (error) throw error;

      // Traduire les notifications
      const translatedNotifications = (data || []).map(notification => translateNotification(notification));

      setNotifications(translatedNotifications);
      setUnreadCount(data?.filter(n => !n.read).length || 0);
    } catch (error) {
      console.error('Erreur lors de la récupération des notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, translateNotification]);

  // Marquer une notification comme lue
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Erreur lors du marquage comme lu:', error);
    }
  }, []);

  // Marquer toutes les notifications comme lues
  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Erreur lors du marquage global comme lu:', error);
    }
  }, [user?.id]);

  // Supprimer une notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      const notification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
    }
  }, [notifications]);

  // Créer une nouvelle notification avec traduction
  const createNotification = useCallback(async (
    userId: string,
    type: NotificationType,
    titleParams: Record<string, any> = {},
    messageParams: Record<string, any> = {},
    data: Record<string, any> = {}
  ) => {
    try {
      const t = getTranslations();
      const titleTemplate = t.notifications.types[type]?.title || 'Notification';
      const messageTemplate = t.notifications.types[type]?.message || 'Vous avez une nouvelle notification';
      
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type,
          title: formatMessage(titleTemplate, titleParams),
          message: formatMessage(messageTemplate, messageParams),
          title_key: type,
          message_key: type,
          title_params: titleParams,
          message_params: messageParams,
          data
        });

      if (error) throw error;
    } catch (error) {
      console.error('Erreur lors de la création de notification:', error);
    }
  }, [getTranslations]);

  // Créer une notification pour tous les admins
  const createAdminNotification = useCallback(async (
    type: NotificationType,
    titleParams: Record<string, any> = {},
    messageParams: Record<string, any> = {},
    data: Record<string, any> = {}
  ) => {
    try {
      // Récupérer tous les admins
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('role', 'admin');

      if (usersError) throw usersError;

      // Créer une notification pour chaque admin
      const notificationPromises = users?.map(admin => 
        createNotification(admin.user_id, type, titleParams, messageParams, data)
      ) || [];

      if (notificationPromises.length > 0) {
        await Promise.all(notificationPromises);
      }
    } catch (error) {
      console.error('Erreur lors de la création de notifications admin:', error);
    }
  }, [createNotification]);

  // Fonction pour établir la connexion temps réel (optimisée)
  const setupRealtimeConnection = useCallback(() => {
    if (!user?.id) return;

    // Nettoyer la connexion précédente
    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }

    // Créer une nouvelle connexion
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const rawNotification = payload.new as Notification;
          const newNotification = translateNotification(rawNotification);
          
          setNotifications(prev => [newNotification, ...prev.slice(0, 19)]);
          setUnreadCount(prev => prev + 1);
          setHasNewNotification(true);
          
          // Son et toast seulement pour les notifications importantes
          if (['task_assigned', 'meeting_invitation', 'meeting_started', 'message_received'].includes(newNotification.type)) {
            playNotificationSound();
            toast({
              title: newNotification.title,
              description: newNotification.message,
              duration: 3000, // Réduire la durée
            });
          }

          // Reset de l'animation
          setTimeout(() => setHasNewNotification(false), 2000);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const rawNotification = payload.new as Notification;
          const updatedNotification = translateNotification(rawNotification);
          setNotifications(prev =>
            prev.map(n =>
              n.id === updatedNotification.id ? updatedNotification : n
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const deletedNotification = payload.old as Notification;
          setNotifications(prev => prev.filter(n => n.id !== deletedNotification.id));
          if (!deletedNotification.read) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
        
        if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          // Reconnexion moins agressive
          reconnectTimeoutRef.current = setTimeout(() => {
            setupRealtimeConnection();
          }, 10000); // 10 secondes au lieu de 5
        }
      });

    channelRef.current = channel;
  }, [user?.id, toast, playNotificationSound, translateNotification]);

  // Écouter les nouvelles notifications en temps réel
  useEffect(() => {
    if (!user?.id) return;

    // Charger les notifications initiales
    fetchNotifications(true);

    // Configurer la connexion temps réel
    setupRealtimeConnection();

    // Nettoyage
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [user?.id, setupRealtimeConnection, fetchNotifications]);

  // Recharger les notifications quand la langue change
  useEffect(() => {
    if (notifications.length > 0) {
      setNotifications(prev => prev.map(notification => translateNotification(notification)));
    }
  }, [language, translateNotification]);

  // Fonction pour reconnecter manuellement
  const reconnect = useCallback(() => {
    setupRealtimeConnection();
  }, [setupRealtimeConnection]);

  return {
    notifications,
    unreadCount,
    loading,
    isConnected,
    hasNewNotification,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    createNotification,
    createAdminNotification,
    reconnect
  };
} 