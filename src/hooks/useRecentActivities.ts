import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { NOTIFICATIONS, DASHBOARD } from '@/lib/constants';
import { 
  Briefcase, 
  CheckCircle, 
  Users, 
  ClipboardCheck, 
  AlertTriangle,
  FileUp,
  Clock,
  UserPlus,
  MessageSquare,
  Video,
  Target
} from 'lucide-react';

export interface RecentActivity {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  iconType: string;
  project_name?: string;
  user_name?: string;
  read?: boolean;
}

export function useRecentActivities() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fonction pour formater les messages avec paramètres
  const formatMessage = useCallback((template: string, params: Record<string, any> = {}): string => {
    let result = template;
    
    // Remplacer les paramètres simples {paramName}
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        const regex = new RegExp(`{${key}}`, 'g');
        result = result.replace(regex, String(value));
      }
    });

    return result;
  }, []);

  // Traduire une notification en utilisant les constantes
  const translateActivity = useCallback((activity: any): RecentActivity => {
    const notificationConfig = (NOTIFICATIONS.types as any)[activity.type];
    
    if (notificationConfig && typeof notificationConfig !== 'string') {
      return {
        ...activity,
        title: formatMessage(notificationConfig.title, activity.title_params || {}),
        description: formatMessage(notificationConfig.message, activity.message_params || {}),
        iconType: getIconType(activity.type)
      };
    }
    
    // Sinon, utiliser les textes existants ou générer des traductions basiques
    const basicTranslation = getBasicTranslation(activity.type, activity);
    
    return {
      ...activity,
      title: basicTranslation.title,
      description: basicTranslation.description,
      iconType: getIconType(activity.type)
    };
  }, [formatMessage]);

  // Obtenir le type d'icône selon le type de notification
  const getIconType = useCallback((type: string): string => {
    const iconMap: Record<string, string> = {
      'file_uploaded': 'file',
      'file_validation_request': 'file',
      'task_assigned': 'task',
      'task_validated': 'check',
      'task_validation_request': 'task',
      'project_added': 'project',
      'message_received': 'message',
      'new_message': 'message',
      'user_joined': 'user',
      'project_created': 'project',
      'project_completed': 'check',
      'task_completed': 'check'
    };
    
    return iconMap[type] || 'clock';
  }, []);

  // Traductions basiques pour les activités
  const getBasicTranslation = useCallback((type: string, activity: any) => {
    switch (type) {
      case 'task_assigned':
        return {
          title: 'Nouvelle tâche assignée',
          description: `${activity.task_name || 'Tâche'} - ${activity.project_name || 'Projet'}`
        };
      case 'task_validated':
        return {
          title: 'Tâche validée',
          description: `${activity.task_name || 'Tâche'} a été validée`
        };
      case 'project_added':
        return {
          title: 'Ajouté au projet',
          description: `Vous avez été ajouté au projet ${activity.project_name || 'Projet'}`
        };
      case 'file_uploaded':
        return {
          title: 'Fichier uploadé',
          description: `${activity.file_name || 'Fichier'} a été uploadé`
        };
      case 'message_received':
        return {
          title: 'Nouveau message',
          description: `Message de ${activity.sender_name || 'Utilisateur'}`
        };
      default:
        return {
          title: activity.title || 'Activité',
          description: activity.description || activity.message || 'Nouvelle activité'
        };
    }
  }, []);

  // Enrichir les notifications avec des données supplémentaires
  const enrichNotifications = useCallback(async (notifications: any[]): Promise<RecentActivity[]> => {
    const enrichedActivities = await Promise.all(
      notifications.map(async (notification) => {
        let enrichedActivity = { 
          ...notification,
          timestamp: notification.created_at || notification.timestamp || new Date().toISOString()
        };
        
        // Enrichir selon le type de notification
        if (notification.data) {
          try {
            const data = typeof notification.data === 'string' 
              ? JSON.parse(notification.data) 
              : notification.data;
            
            enrichedActivity = {
              ...enrichedActivity,
              project_name: data.projectName,
              task_name: data.taskName,
              file_name: data.fileName,
              sender_name: data.senderName,
              user_name: data.userName
            };
          } catch (error) {
          }
        }
        
        return translateActivity(enrichedActivity);
      })
    );
    
    return enrichedActivities;
  }, [translateActivity]);

  // Fonction pour récupérer les activités récentes pour un intervenant
  const fetchIntervenantActivities = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data: notifications, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(15);

      if (error) throw error;

      const enrichedActivities = await enrichNotifications(notifications || []);
      setActivities(enrichedActivities);
    } catch (error) {
      setError('Impossible de charger les activités');
    }
  }, [user?.id, enrichNotifications]);

  // Fonction pour récupérer toutes les activités récentes pour un admin
  const fetchAdminActivities = useCallback(async () => {
    try {
      const { data: notifications, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const enrichedActivities = await enrichNotifications(notifications || []);
      setActivities(enrichedActivities);
    } catch (error) {
      setError('Impossible de charger les activités');
    }
  }, [enrichNotifications]);

  // Fonction principale pour récupérer les activités
  const fetchActivities = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const adminStatus = role === 'admin' || user?.email === 'admin@aps.com';
      
      if (adminStatus) {
        await fetchAdminActivities();
      } else {
        await fetchIntervenantActivities();
      }
    } catch (error) {
      setError('Impossible de charger les activités');
      toast({
        title: "Erreur",
        description: "Impossible de charger les activités récentes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, role, fetchAdminActivities, fetchIntervenantActivities, toast]);

  // Fonction pour marquer une activité comme lue
  const markAsRead = useCallback(async (activityId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', activityId);

      if (error) throw error;

      setActivities(prev => 
        prev.map(activity => 
          activity.id === activityId 
            ? { ...activity, read: true }
            : activity
        )
      );
    } catch (error) {
    }
  }, []);

  // Fonction pour actualiser les activités
  const refetch = useCallback(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Charger les activités au montage
  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  return {
    activities,
    loading,
    error,
    markAsRead,
    refetch
  };
} 