import { useCallback, useState, useEffect } from 'react';
import { useSupabase } from './useSupabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { useNotificationTriggers } from './useNotificationTriggers';

export interface VideoMeeting {
  id: string;
  title: string;
  roomId: string;
  description?: string;
  projectId?: string;
  projectName?: string;
  scheduledTime?: Date;
  isInstant: boolean;
  status: 'scheduled' | 'active' | 'ended' | 'cancelled';
  createdBy: string;
  createdAt: Date;
  endedAt?: Date;
  recordingAvailable: boolean;
  participants: VideoMeetingParticipant[];
  recordingCount?: number;
}

export interface VideoMeetingParticipant {
  id: string;
  userId: string;
  meetingId: string;
  name: string;
  email: string;
  role: 'host' | 'participant';
  status: 'invited' | 'accepted' | 'declined' | 'joined';
  joinedAt?: Date;
  leftAt?: Date;
}

export interface MeetingRequest {
  id: string;
  title: string;
  description?: string;
  projectId?: string;
  projectName?: string;
  requestedBy: string;
  requestedByName: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedTime: Date;
  scheduledTime?: Date;
  suggestedParticipants: {
    id: string;
    userId: string;
    name: string;
  }[];
}

export interface MeetingRecording {
  id: string;
  fileUrl: string;
  thumbnailUrl?: string;
  durationSeconds: number;
  fileSizeBytes: number;
  startedAt: Date;
  endedAt?: Date;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
}

export function useVideoMeetingsImproved() {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [meetings, setMeetings] = useState<VideoMeeting[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);

  // Vérifier si l'utilisateur est admin
  const isAdmin = user?.user_metadata?.role === 'admin' || user?.email === 'admin@aphs.com';

  // Charger les projets accessibles
  const loadUserProjects = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase.rpc('get_user_accessible_projects', {
        p_user_id: user.id
      });
      
      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des projets:', error);
    }
  }, [user, supabase]);

  // Récupérer toutes les réunions pour un admin
  const getAllMeetings = useCallback(async (): Promise<VideoMeeting[]> => {
    if (!user) return [];
    setLoadingMeetings(true);
    
    try {
      const { data, error } = await supabase
        .from('meeting_details')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const meetings = (data || []).map(meeting => ({
        id: meeting.id,
        title: meeting.title,
        roomId: meeting.room_id,
        description: meeting.description,
        projectId: meeting.project_id,
        projectName: meeting.project_name,
        scheduledTime: meeting.scheduled_time ? new Date(meeting.scheduled_time) : undefined,
        isInstant: meeting.is_instant,
        status: meeting.status,
        createdBy: meeting.created_by,
        createdAt: new Date(meeting.created_at),
        endedAt: meeting.ended_at ? new Date(meeting.ended_at) : undefined,
        recordingAvailable: meeting.recording_available,
        recordingCount: meeting.recording_count,
        participants: []
      }));

      // Charger les participants pour chaque réunion
      for (const meeting of meetings) {
        const { data: participantsData, error: participantsError } = await supabase
          .from('video_meeting_participants')
          .select(`
            id, user_id, meeting_id, role, status, joined_at, left_at,
            profiles!inner(first_name, last_name, email)
          `)
          .eq('meeting_id', meeting.id);

                 if (!participantsError && participantsData) {
           meeting.participants = participantsData.map(p => {
             const profile = p.profiles as any;
             return {
               id: p.id,
               userId: p.user_id,
               meetingId: p.meeting_id,
               name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || profile?.email || 'Utilisateur inconnu',
               email: profile?.email || '',
               role: p.role,
               status: p.status,
               joinedAt: p.joined_at ? new Date(p.joined_at) : undefined,
               leftAt: p.left_at ? new Date(p.left_at) : undefined
             };
           });
         }
      }

      setMeetings(meetings);
      return meetings;
    } catch (error) {
      console.error('Erreur lors de la récupération des réunions:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de récupérer les réunions',
        variant: 'destructive'
      });
      return [];
    } finally {
      setLoadingMeetings(false);
    }
  }, [user, supabase, toast]);

  // Récupérer les réunions d'un utilisateur
  const getUserMeetings = useCallback(async (): Promise<VideoMeeting[]> => {
    if (!user) return [];
    setLoadingMeetings(true);
    
    try {
      const { data, error } = await supabase
        .from('video_meeting_participants')
        .select(`
          id, user_id, meeting_id, role, status, joined_at, left_at,
          meeting:video_meetings!inner(
            id, title, room_id, description, project_id, scheduled_time,
            is_instant, status, created_by, created_at, ended_at, recording_available,
            projects(name)
          )
        `)
        .eq('user_id', user.id)
        .order('meeting(scheduled_time)', { ascending: true });

      if (error) throw error;

      const meetings = (data || []).map(item => {
        const meeting = item.meeting as any;
        return {
          id: meeting.id,
          title: meeting.title,
          roomId: meeting.room_id,
          description: meeting.description,
          projectId: meeting.project_id,
          projectName: meeting.projects?.name,
          scheduledTime: meeting.scheduled_time ? new Date(meeting.scheduled_time) : undefined,
          isInstant: meeting.is_instant,
          status: meeting.status,
          createdBy: meeting.created_by,
          createdAt: new Date(meeting.created_at),
          endedAt: meeting.ended_at ? new Date(meeting.ended_at) : undefined,
          recordingAvailable: meeting.recording_available,
          participants: []
        };
      });

      setMeetings(meetings);
      return meetings;
    } catch (error) {
      console.error('Erreur lors de la récupération des réunions utilisateur:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de récupérer vos réunions',
        variant: 'destructive'
      });
      return [];
    } finally {
      setLoadingMeetings(false);
    }
  }, [user, supabase, toast]);

  // Créer une nouvelle réunion
  const createMeeting = useCallback(async (
    title: string,
    participants: string[],
    options?: { 
      description?: string; 
      scheduledTime?: Date; 
      isInstant?: boolean;
      projectId?: string;
    }
  ): Promise<string | null> => {
    if (!user) return null;
    setLoading(true);

    try {
      const roomId = `meeting-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const { data: meeting, error: meetingError } = await supabase
        .from('video_meetings')
        .insert({
          title,
          room_id: roomId,
          description: options?.description,
          project_id: options?.projectId,
          scheduled_time: options?.scheduledTime?.toISOString(),
          is_instant: options?.isInstant || false,
          created_by: user.id
        })
        .select()
        .single();

      if (meetingError) throw meetingError;

      // Ajouter le créateur comme host
      await supabase.rpc('add_meeting_participant', {
        p_meeting_id: meeting.id,
        p_user_id: user.id,
        p_role: 'host',
        p_status: 'joined'
      });

      // Ajouter les autres participants
      for (const participantId of participants) {
        if (participantId !== user.id) {
          await supabase.rpc('add_meeting_participant', {
            p_meeting_id: meeting.id,
            p_user_id: participantId,
            p_role: 'participant',
            p_status: 'invited'
          });
        }
      }

      toast({
        title: 'Succès',
        description: 'Réunion créée avec succès'
      });

      return meeting.id;
    } catch (error) {
      console.error('Erreur lors de la création de la réunion:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de créer la réunion',
        variant: 'destructive'
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, supabase, toast]);

  // Supprimer une réunion
  const deleteMeeting = useCallback(async (meetingId: string): Promise<boolean> => {
    if (!user) return false;
    setLoading(true);

    try {
      const { error } = await supabase.rpc('delete_meeting', {
        p_meeting_id: meetingId,
        p_user_id: user.id
      });

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Réunion supprimée avec succès'
      });

      // Rafraîchir la liste
      if (isAdmin) {
        await getAllMeetings();
      } else {
        await getUserMeetings();
      }

      return true;
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de supprimer la réunion',
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, supabase, toast, isAdmin, getAllMeetings, getUserMeetings]);

  // Quitter une réunion (sans la terminer - la réunion reste active)
  const leaveMeeting = useCallback(async (meetingId: string): Promise<boolean> => {
    if (!user) return false;
    setLoading(true);
    
    try {
      // Marquer le participant comme ayant quitté la réunion
      const { error } = await supabase
        .from('video_meeting_participants')
        .update({ 
          left_at: new Date().toISOString()
        })
        .eq('meeting_id', meetingId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Vous avez quitté la réunion',
        description: 'La réunion reste en cours pour les autres participants'
      });

      // Rafraîchir la liste
      if (isAdmin) {
        await getAllMeetings();
      } else {
        await getUserMeetings();
      }

      return true;
    } catch (error) {
      console.error('Erreur lors de la sortie de la réunion:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de quitter la réunion',
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, supabase, toast, isAdmin, getAllMeetings, getUserMeetings]);

  // Terminer une réunion proprement
  const endMeeting = useCallback(async (meetingId: string): Promise<boolean> => {
    if (!user) return false;
    setLoading(true);

    try {
      const { error } = await supabase.rpc('end_meeting_properly', {
        p_meeting_id: meetingId,
        p_user_id: user.id
      });

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Réunion terminée avec succès'
      });

      // Rafraîchir la liste
      if (isAdmin) {
        await getAllMeetings();
      } else {
        await getUserMeetings();
      }

      return true;
    } catch (error) {
      console.error('Erreur lors de la fin de réunion:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de terminer la réunion',
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, supabase, toast, isAdmin, getAllMeetings, getUserMeetings]);

  // Rejoindre une réunion
  const joinMeeting = useCallback(async (meetingId: string) => {
    if (!user) return null;
    setLoading(true);

    try {
      const { error } = await supabase.rpc('safe_join_meeting', {
        p_meeting_id: meetingId,
        p_user_id: user.id
      });

      if (error) throw error;

      const { data: meeting, error: meetingError } = await supabase
        .from('video_meetings')
        .select('room_id, title')
        .eq('id', meetingId)
        .single();

      if (meetingError) throw meetingError;

      return {
        roomId: meeting.room_id,
        title: meeting.title,
        isModerator: false
      };
    } catch (error) {
      console.error('Erreur lors de la connexion à la réunion:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de rejoindre la réunion',
        variant: 'destructive'
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, supabase, toast]);

  // Obtenir les enregistrements d'une réunion
  const getMeetingRecordings = useCallback(async (meetingId: string): Promise<MeetingRecording[]> => {
    if (!user) return [];

    try {
      const { data, error } = await supabase.rpc('get_meeting_recordings', {
        p_meeting_id: meetingId,
        p_user_id: user.id
      });

      if (error) throw error;

      return (data || []).map(recording => ({
        id: recording.id,
        fileUrl: recording.file_url,
        thumbnailUrl: recording.thumbnail_url,
        durationSeconds: recording.duration_seconds,
        fileSizeBytes: recording.file_size_bytes,
        startedAt: new Date(recording.started_at),
        endedAt: recording.ended_at ? new Date(recording.ended_at) : undefined
      }));
    } catch (error) {
      console.error('Erreur lors de la récupération des enregistrements:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de récupérer les enregistrements',
        variant: 'destructive'
      });
      return [];
    }
  }, [user, supabase, toast]);

  // Demander une réunion
  const requestMeeting = useCallback(async (
    title: string,
    description: string,
    scheduledTime: Date,
    suggestedParticipants: string[],
    projectId?: string
  ): Promise<boolean> => {
    if (!user) return false;
    setLoading(true);

    try {
      const { data: request, error: requestError } = await supabase
        .from('video_meeting_requests')
        .insert({
          title,
          description,
          project_id: projectId,
          requested_by: user.id,
          scheduled_time: scheduledTime.toISOString()
        })
        .select()
        .single();

      if (requestError) throw requestError;

      // Ajouter les participants suggérés
      for (const participantId of suggestedParticipants) {
        await supabase
          .from('video_meeting_request_participants')
          .insert({
            request_id: request.id,
            user_id: participantId
          });
      }

      return true;
    } catch (error) {
      console.error('Erreur lors de la demande de réunion:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'envoyer la demande de réunion',
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, supabase, toast]);

  // Nettoyer l'historique des réunions terminées (admin uniquement)
  const clearCompletedMeetings = useCallback(async (): Promise<boolean> => {
    if (!user || !isAdmin) return false;
    setLoading(true);
    try {
      // Supprimer toutes les réunions terminées ou annulées
      const { data: completedMeetings, error: fetchError } = await supabase
        .from('video_meetings')
        .select('id')
        .in('status', ['ended', 'cancelled']);

      if (fetchError) throw fetchError;

      if (!completedMeetings || completedMeetings.length === 0) {
        toast({
          title: 'Information',
          description: 'Aucune réunion terminée à supprimer'
        });
        return true;
      }

      const { error: deleteError } = await supabase
        .from('video_meetings')
        .delete()
        .in('status', ['ended', 'cancelled']);

      if (deleteError) throw deleteError;

      toast({
        title: 'Historique nettoyé',
        description: `${completedMeetings.length} réunion(s) terminée(s) supprimée(s)`
      });

      return true;
    } catch (error) {
      console.error('Erreur lors du nettoyage de l\'historique:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de nettoyer l\'historique',
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, supabase, toast]);

  // Charger les projets au montage
  useEffect(() => {
    if (user) {
      loadUserProjects();
    }
  }, [user, loadUserProjects]);

  return {
    loading,
    loadingMeetings,
    meetings,
    projects,
    isAdmin,
    getAllMeetings,
    getUserMeetings,
    createMeeting,
    deleteMeeting,
    clearCompletedMeetings,
    leaveMeeting,
    endMeeting,
    joinMeeting,
    getMeetingRecordings,
    requestMeeting,
    loadUserProjects
  };
} 