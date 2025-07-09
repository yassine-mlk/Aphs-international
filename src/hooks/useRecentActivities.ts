import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { 
  Briefcase, 
  CheckCircle, 
  Users, 
  ClipboardCheck, 
  AlertTriangle,
  FileUp,
  Clock,
  UserPlus,
  MessageSquare
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
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Fonction pour obtenir le type d'icône basée sur le type de notification
  const getNotificationIconType = (type: string): string => {
    switch (type) {
      case 'task_assigned':
        return 'task_assigned';
      case 'task_validated':
        return 'task_validated';
      case 'project_added':
        return 'project_added';
      case 'file_uploaded':
        return 'file_uploaded';
      case 'meeting_request':
        return 'meeting_request';
      case 'meeting_invitation':
        return 'meeting_invitation';
      case 'new_message':
        return 'new_message';
      case 'task_validation_request':
        return 'task_validation_request';
      default:
        return 'default';
    }
  };

  // Fonction pour obtenir les informations utilisateur
  const getUserInfo = useCallback(async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return profile ? `${profile.first_name} ${profile.last_name}` : 'Utilisateur inconnu';
    } catch (error) {
      console.error('Erreur lors de la récupération des informations utilisateur:', error);
      return 'Utilisateur inconnu';
    }
  }, []);

  // Fonction pour obtenir les informations projet
  const getProjectInfo = useCallback(async (projectId: string) => {
    try {
      const { data: project, error } = await supabase
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      return project?.name || 'Projet inconnu';
    } catch (error) {
      console.error('Erreur lors de la récupération des informations projet:', error);
      return 'Projet inconnu';
    }
  }, []);

  // Fonction pour enrichir les notifications avec les informations supplémentaires
  const enrichNotifications = useCallback(async (notifications: any[]) => {
    const enrichedActivities: RecentActivity[] = [];

    for (const notification of notifications) {
      let description = notification.message;
      let userName = '';
      let projectName = '';

      // Enrichir avec les informations utilisateur si disponible
      if (notification.data?.user_id) {
        userName = await getUserInfo(notification.data.user_id);
      }

      // Enrichir avec les informations projet si disponible
      if (notification.data?.project_id) {
        projectName = await getProjectInfo(notification.data.project_id);
      }

      // Enrichir la description
      if (userName && projectName) {
        description = `${userName} - ${projectName}`;
      } else if (userName) {
        description = `${userName} - ${description}`;
      } else if (projectName) {
        description = `${projectName} - ${description}`;
      }

      enrichedActivities.push({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        description,
        timestamp: notification.created_at,
        iconType: getNotificationIconType(notification.type),
        project_name: projectName,
        user_name: userName,
        read: notification.read
      });
    }

    return enrichedActivities;
  }, [getUserInfo, getProjectInfo]);

  // Fonction pour récupérer les activités récentes pour un intervenant
  const fetchIntervenantActivities = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data: notifications, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

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
        .limit(15);

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

  // Configurer les mises à jour en temps réel
  useEffect(() => {
    if (!user?.id) return;

    // Charger les activités initialement
    fetchActivities();

    // Configurer les mises à jour en temps réel
    const channel = supabase
      .channel('activities_updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications'
        },
        () => {
          // Rafraîchir les activités quand une nouvelle notification arrive
          fetchActivities();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications'
        },
        () => {
          // Rafraîchir les activités quand une notification est mise à jour
          fetchActivities();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id, fetchActivities]);

  return {
    activities,
    loading,
    error,
    markAsRead,
    refetch
  };
} 