import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/components/ui/use-toast';
import { translations } from '@/lib/translations';
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
  // Nouveaux champs pour les traductions
  title_key?: string;
  message_key?: string;
  title_params?: Record<string, any>;
  message_params?: Record<string, any>;
}

export function useRecentActivities() {
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();

  // Obtenir les traductions pour la langue actuelle
  const getTranslations = useCallback(() => {
    return translations[language as keyof typeof translations];
  }, [language]);

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

    // Gérer les conditions select {param, select, undefined {} other {text}}
    const selectRegex = /{(\w+),\s*select,\s*undefined\s*{}\s*other\s*{\s*([^}]+)\s*}}/g;
    result = result.replace(selectRegex, (match, paramName, otherText) => {
      const value = params[paramName];
      return value !== undefined && value !== null && value !== '' ? otherText : '';
    });

    return result;
  }, []);

  // Traduire une notification selon la langue actuelle
  const translateActivity = useCallback((activity: any): RecentActivity => {
    const t = getTranslations();
    
    // Si l'activité a des clés de traduction, les utiliser
    if (activity.title_key && activity.message_key && t.notifications?.types?.[activity.type]) {
      const notificationConfig = t.notifications.types[activity.type];
      
      return {
        ...activity,
        title: formatMessage(notificationConfig.title, activity.title_params || {}),
        description: formatMessage(notificationConfig.message, activity.message_params || {}),
        iconType: getIconType(activity.type)
      };
    }
    
    // Sinon, utiliser les textes existants ou générer des traductions basiques
    const basicTranslation = getBasicTranslation(activity.type, activity, t);
    
    return {
      ...activity,
      title: basicTranslation.title,
      description: basicTranslation.description,
      iconType: getIconType(activity.type)
    };
  }, [getTranslations, formatMessage]);

  // Obtenir le type d'icône selon le type de notification
  const getIconType = useCallback((type: string): string => {
    const iconMap: Record<string, string> = {
      'file_uploaded': 'file',
      'file_validation_request': 'file',
      'task_assigned': 'task',
      'task_validated': 'check',
      'task_validation_request': 'task',
      'project_added': 'project',
      'meeting_invitation': 'meeting',
      'meeting_started': 'meeting',
      'meeting_request': 'meeting',
      'meeting_request_approved': 'meeting',
      'meeting_request_rejected': 'meeting',
      'message_received': 'message',
      'new_message': 'message',
      'user_joined': 'user',
      'project_created': 'project',
      'project_completed': 'check',
      'task_completed': 'check'
    };
    
    return iconMap[type] || 'clock';
  }, []);

  // Traductions basiques pour les activités sans clés de traduction
  const getBasicTranslation = useCallback((type: string, activity: any, t: any) => {
    const activityTranslations = t.dashboard?.specialist?.recentActivities || t.dashboard?.masterOwner?.recentActivities;
    
    switch (type) {
      case 'task_assigned':
        return {
          title: activityTranslations?.taskAssigned || 'Nouvelle tâche assignée',
          description: `${activity.task_name || 'Tâche'} - ${activity.project_name || 'Projet'}`
        };
      case 'task_validated':
        return {
          title: activityTranslations?.taskValidated || 'Tâche validée',
          description: `${activity.task_name || 'Tâche'} a été validée`
        };
      case 'project_added':
        return {
          title: activityTranslations?.projectAdded || 'Ajouté au projet',
          description: `Vous avez été ajouté au projet ${activity.project_name || 'Projet'}`
        };
      case 'meeting_invitation':
        return {
          title: activityTranslations?.meetingInvitation || 'Invitation à une réunion',
          description: `Réunion: ${activity.meeting_title || 'Réunion'}`
        };
      case 'meeting_started':
        return {
          title: activityTranslations?.meetingStarted || 'Réunion démarrée',
          description: `La réunion ${activity.meeting_title || 'Réunion'} a commencé`
        };
      case 'file_uploaded':
        return {
          title: activityTranslations?.fileUploaded || 'Fichier uploadé',
          description: `${activity.file_name || 'Fichier'} a été uploadé`
        };
      case 'message_received':
        return {
          title: activityTranslations?.messageReceived || 'Nouveau message',
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
        let enrichedActivity = { ...notification };
        
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
              meeting_title: data.meetingTitle,
              sender_name: data.senderName,
              user_name: data.userName
            };
          } catch (error) {
            console.warn('Erreur parsing data notification:', error);
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
        .limit(15); // Augmenter la limite pour plus d'activités

      if (error) throw error;

      const enrichedActivities = await enrichNotifications(notifications || []);
      setActivities(enrichedActivities);
    } catch (error) {
      console.error('Erreur lors de la récupération des activités intervenant:', error);
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
        .limit(20); // Plus d'activités pour les admins

      if (error) throw error;

      const enrichedActivities = await enrichNotifications(notifications || []);
      setActivities(enrichedActivities);
    } catch (error) {
      console.error('Erreur lors de la récupération des activités admin:', error);
      setError('Impossible de charger les activités');
    }
  }, [enrichNotifications]);

  // Fonction pour déterminer si l'utilisateur est admin
  const isAdmin = useCallback(async () => {
    if (!user?.id) return false;

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return profile?.role === 'admin';
    } catch (error) {
      console.error('Erreur lors de la vérification du rôle:', error);
      return false;
    }
  }, [user?.id]);

  // Fonction principale pour récupérer les activités
  const fetchActivities = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const adminStatus = await isAdmin();
      
      if (adminStatus) {
        await fetchAdminActivities();
      } else {
        await fetchIntervenantActivities();
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des activités:', error);
      setError('Impossible de charger les activités');
      toast({
        title: "Erreur",
        description: "Impossible de charger les activités récentes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, isAdmin, fetchAdminActivities, fetchIntervenantActivities, toast]);

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
      console.error('Erreur lors du marquage comme lu:', error);
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

  // Recharger les activités quand la langue change
  useEffect(() => {
    if (activities.length > 0) {
      // Re-traduire les activités existantes
      const retranslatedActivities = activities.map(activity => translateActivity(activity));
      setActivities(retranslatedActivities);
    }
  }, [language]);

  return {
    activities,
    loading,
    error,
    markAsRead,
    refetch
  };
} 