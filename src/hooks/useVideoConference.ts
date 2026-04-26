import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import { useToast } from '@/components/ui/use-toast';
import { useNotificationTriggers } from '@/hooks/useNotificationTriggers';
import type { 
  VideoMeeting, 
  CreateVideoMeetingData 
} from '@/types/videoconference';

export function useVideoConference() {
  const { user, status: authStatus } = useAuth();
  const { tenant } = useTenant();
  const { toast } = useToast();
  const { createNotification, createAdminNotification } = useNotificationTriggers();
  const [meetings, setMeetings] = useState<VideoMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [effectiveTenantId, setEffectiveTenantId] = useState<string | null>(null);

  // Déterminer l'ID du tenant de manière robuste
  useEffect(() => {
    const resolveTenantId = async () => {
      if (authStatus !== 'authenticated') return;
      if (tenant?.id) {
        setEffectiveTenantId(tenant.id);
        return;
      }

      if (user?.id) {
        // Fallback: chercher dans le profil
        const { data, error } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('user_id', user.id)
          .single();
        
        if (!error && data?.tenant_id) {
          setEffectiveTenantId(data.tenant_id);
        }
      }
    };

    resolveTenantId();
  }, [authStatus, tenant?.id, user?.id]);

  const fetchMeetings = useCallback(async () => {
    if (authStatus !== 'authenticated' || !effectiveTenantId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('video_meetings')
        .select('*')
        .eq('tenant_id', effectiveTenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMeetings(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur lors de la récupération des réunions",
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  }, [authStatus, effectiveTenantId, toast]);

  useEffect(() => {
    if (authStatus === 'authenticated') {
      fetchMeetings();
    }
  }, [fetchMeetings, authStatus]);

  const createMeeting = async (data: CreateVideoMeetingData) => {
    console.log("createMeeting called with data:", data);
    
    // Utiliser effectiveTenantId ou tenant?.id ou chercher une dernière fois
    let tId = effectiveTenantId || tenant?.id;
    
    if (!tId && authStatus === 'authenticated' && user?.id) {
      const { data: prof } = await supabase.from('profiles').select('tenant_id').eq('user_id', user.id).single();
      tId = prof?.tenant_id;
    }

    if (authStatus !== 'authenticated' || !user?.id || !tId) {
      console.warn("Missing user or tenant ID", { userId: user?.id, tenantId: tId });
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'identifier votre organisation (Tenant ID manquant)."
      });
      return null;
    }

    try {
      // Préparer la date : si vide, mettre à null
      const scheduledAt = data.scheduled_at && data.scheduled_at.trim() !== "" 
        ? data.scheduled_at 
        : null;

      console.log("Inserting meeting for tenant:", tId);
      // 1. Créer la réunion
      const { data: meeting, error: meetingError } = await supabase
        .from('video_meetings')
        .insert([{
          tenant_id: tId,
          created_by: user.id,
          title: data.title,
          description: data.description,
          scheduled_at: scheduledAt,
          status: data.status || 'scheduled',
          is_recording_enabled: data.is_recording_enabled || false,
          room_name: `aps-${tId.substring(0, 8)}-${Math.random().toString(36).substring(7)}`
        }])
        .select()
        .single();

      if (meetingError) {
        console.error("Meeting insertion error:", meetingError);
        throw meetingError;
      }

      console.log("Meeting inserted:", meeting);

      // 2. Ajouter les participants et notifier
      if (data.participants && data.participants.length > 0) {
        console.log("Adding participants:", data.participants);
        const participantsData = data.participants.map(userId => ({
          meeting_id: meeting.id,
          user_id: userId,
          tenant_id: tId,
          role: 'participant',
          status: 'invited'
        }));

        // Ajouter aussi le créateur comme modérateur s'il n'est pas déjà dans la liste
        if (!data.participants.includes(user.id)) {
          participantsData.push({
            meeting_id: meeting.id,
            user_id: user.id,
            tenant_id: tId,
            role: 'moderator',
            status: 'present'
          });
        }

        const { error: participantsError } = await supabase
          .from('video_meeting_participants')
          .insert(participantsData);

        if (participantsError) {
          console.error("Participants insertion error:", participantsError);
          throw participantsError;
        }

        // Notifier les participants si la réunion est programmée
        if (data.status === 'scheduled') {
          console.log("Sending notifications to participants...");
          const notificationPromises = data.participants.map(userId => 
            createNotification(userId, 'videoconf_scheduled', {}, {
              title: data.title,
              date: scheduledAt ? new Date(scheduledAt).toLocaleString('fr-FR') : 'bientôt'
            }, { meetingId: meeting.id })
          );
          await Promise.all(notificationPromises);
        }
      }

      // Notifier l'admin si c'est une demande (pending)
      if (data.status === 'pending') {
        console.log("Sending notification to admin...");
        await createAdminNotification('videoconf_request', {}, {
          intervenantName: `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() || user.email,
          title: data.title
        }, { meetingId: meeting.id }, tId);
      }

      toast({
        title: "Réunion créée avec succès",
        description: data.status === 'pending' ? "Votre demande a été envoyée à l'administrateur." : "La réunion a été programmée."
      });

      fetchMeetings();
      return meeting;
    } catch (error: any) {
      console.error("Caught error in createMeeting:", error);
      toast({
        variant: "destructive",
        title: "Erreur lors de la création de la réunion",
        description: error.message
      });
      return null;
    }
  };

  const updateMeetingStatus = async (meetingId: string, status: VideoMeeting['status']) => {
    if (authStatus !== 'authenticated') return;
    try {
      const { data: meeting, error: fetchError } = await supabase
        .from('video_meetings')
        .select('*')
        .eq('id', meetingId)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('video_meetings')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', meetingId);

      if (error) throw error;
      
      // Notifier l'intervenant si sa demande est acceptée ou refusée
      if (meeting.status === 'pending') {
        if (status === 'scheduled') {
          await createNotification(meeting.created_by, 'videoconf_accepted', {}, {
            title: meeting.title
          }, { meetingId });
        } else if (status === 'cancelled') {
          await createNotification(meeting.created_by, 'videoconf_rejected', {}, {
            title: meeting.title
          }, { meetingId });
        }
      }

      toast({
        title: "Statut mis à jour",
        description: `La réunion est maintenant ${status}.`
      });
      
      fetchMeetings();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur lors de la mise à jour",
        description: error.message
      });
    }
  };

  const joinMeeting = async (meetingId: string) => {
    if (authStatus !== 'authenticated' || !user?.id || !effectiveTenantId) return;

    try {
      const now = new Date().toISOString();
      
      // 1. Mettre à jour le statut du participant
      const { error } = await supabase
        .from('video_meeting_participants')
        .update({ 
          status: 'present',
          joined_at: now
        })
        .eq('meeting_id', meetingId)
        .eq('user_id', user.id);

      if (error) throw error;

      // 2. Si c'est le premier à rejoindre et que le statut est 'scheduled', passer à 'active'
      const { data: meeting } = await supabase
        .from('video_meetings')
        .select('status, started_at')
        .eq('id', meetingId)
        .single();
      
      if (meeting && meeting.status === 'scheduled') {
        await supabase
          .from('video_meetings')
          .update({ 
            status: 'active',
            started_at: meeting.started_at || now 
          })
          .eq('id', meetingId);
      }
      
      fetchMeetings();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur lors de la connexion",
        description: error.message
      });
    }
  };

  const leaveMeeting = async (meetingId: string) => {
    if (authStatus !== 'authenticated' || !user?.id) return;

    try {
      const now = new Date().toISOString();
      
      // 1. Mettre à jour le statut du participant (temps de sortie)
      const { error: partError } = await supabase
        .from('video_meeting_participants')
        .update({ 
          status: 'absent',
          left_at: now
        })
        .eq('meeting_id', meetingId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (partError) throw partError;

      // 2. Calculer la durée de la réunion si elle est terminée
      const { data: meeting, error: meetingError } = await supabase
        .from('video_meetings')
        .select('started_at, ended_at, status')
        .eq('id', meetingId)
        .single();

      if (!meetingError && meeting && meeting.status === 'completed' && meeting.started_at) {
        const start = new Date(meeting.started_at).getTime();
        const end = meeting.ended_at ? new Date(meeting.ended_at).getTime() : new Date().getTime();
        const durationMinutes = Math.round((end - start) / (1000 * 60));

        await supabase
          .from('video_meetings')
          .update({ duration_minutes: durationMinutes })
          .eq('id', meetingId);
      }

      toast({
        title: "Vous avez quitté la réunion"
      });
      
      fetchMeetings();
    } catch (error: any) {
      console.error("Error leaving meeting:", error);
    }
  };

  const getMeetingDetails = async (meetingId: string) => {
     if (authStatus !== 'authenticated') return [];
     try {
       // 1. Récupérer les participants
       const { data: participants, error: pError } = await supabase
         .from('video_meeting_participants')
         .select('*')
         .eq('meeting_id', meetingId);

       if (pError) throw pError;
       if (!participants || participants.length === 0) return [];

       // 2. Récupérer les profils associés
       const userIds = participants.map(p => p.user_id);
       const { data: profiles, error: profError } = await supabase
         .from('profiles')
         .select('user_id, first_name, last_name, company')
         .in('user_id', userIds);

       if (profError) throw profError;

       // 3. Fusionner les données
       return participants.map(p => ({
         ...p,
         profile: profiles?.find(prof => prof.user_id === p.user_id) || null
       }));
     } catch (error) {
       console.error("Erreur lors de la récupération des détails:", error);
       return [];
     }
   };

  const updateMeetingParticipants = async (meetingId: string, participantIds: string[]) => {
    if (authStatus !== 'authenticated') return;
    const tId = effectiveTenantId || tenant?.id;
    if (!tId) return;

    try {
      // 1. Supprimer les anciens participants (sauf le créateur s'il est modérateur)
      await supabase
        .from('video_meeting_participants')
        .delete()
        .eq('meeting_id', meetingId)
        .neq('role', 'moderator');

      // 2. Ajouter les nouveaux participants
      const participantsData = participantIds.map(userId => ({
        meeting_id: meetingId,
        user_id: userId,
        tenant_id: tId,
        role: 'participant',
        status: 'invited'
      }));

      const { error } = await supabase
        .from('video_meeting_participants')
        .insert(participantsData);

      if (error) throw error;

      toast({
        title: "Participants mis à jour",
        description: "La liste des participants a été modifiée avec succès."
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur lors de la mise à jour des participants",
        description: error.message
      });
    }
  };

  const getMeetingParticipants = async (meetingId: string) => {
    if (authStatus !== 'authenticated') return [];
    try {
      const { data, error } = await supabase
        .from('video_meeting_participants')
        .select('user_id')
        .eq('meeting_id', meetingId);

      if (error) throw error;
      return data.map(p => p.user_id);
    } catch (error) {
      console.error("Erreur lors de la récupération des participants:", error);
      return [];
    }
  };

  return {
    meetings,
    loading,
    effectiveTenantId,
    fetchMeetings,
    createMeeting,
    updateMeetingStatus,
    joinMeeting,
    leaveMeeting,
    getMeetingDetails,
    updateMeetingParticipants,
    getMeetingParticipants
  };
}
