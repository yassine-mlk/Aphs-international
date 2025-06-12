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
  scheduledTime?: Date;
  isInstant: boolean;
  status: 'scheduled' | 'active' | 'ended' | 'cancelled';
  createdBy: string;
  createdAt: Date;
  participants: VideoMeetingParticipant[];
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
}

export interface MeetingRequest {
  id: string;
  title: string;
  description?: string;
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

export function useVideoMeetings() {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [meetings, setMeetings] = useState<VideoMeeting[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState(false);

  // Récupérer toutes les réunions pour un admin
  const getAllMeetings = useCallback(async (): Promise<VideoMeeting[]> => {
    if (!user) return [];
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('video_meetings')
        .select(`
          *,
          participants:video_meeting_participants(
            id, user_id, meeting_id, role, status, joined_at
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch users for participants
      const participantUserIds = data?.flatMap(meeting => 
        meeting.participants?.map(p => p.user_id) || []
      ).filter(Boolean);
      
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, user_id, first_name, last_name, email')
        .in('user_id', participantUserIds);
      
      if (usersError) throw usersError;
      
      // Create a map of user_id to user data
      const usersMap = new Map();
      usersData?.forEach(user => {
        usersMap.set(user.user_id, user);
      });

      return (data || []).map(meeting => ({
        id: meeting.id,
        title: meeting.title,
        roomId: meeting.room_id,
        description: meeting.description,
        scheduledTime: meeting.scheduled_time ? new Date(meeting.scheduled_time) : undefined,
        isInstant: meeting.is_instant,
        status: meeting.status,
        createdBy: meeting.created_by,
        createdAt: new Date(meeting.created_at),
        participants: (meeting.participants || []).map(p => {
          const user = usersMap.get(p.user_id);
          return {
            id: p.id,
            userId: p.user_id,
            meetingId: p.meeting_id,
            name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email : 'Utilisateur inconnu',
            email: user?.email || '',
            role: p.role,
            status: p.status,
            joinedAt: p.joined_at ? new Date(p.joined_at) : undefined
          };
        })
      }));
    } catch (error) {
      console.error('Erreur lors de la récupération des réunions:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de récupérer les réunions',
        variant: 'destructive'
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [user, supabase, toast]);

  // Récupérer les réunions d'un utilisateur
  const getUserMeetings = useCallback(async (): Promise<VideoMeeting[]> => {
    if (!user) return [];
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('video_meeting_participants')
        .select(`
          id, user_id, meeting_id, role, status, joined_at,
          meeting:video_meetings(*)
        `)
        .eq('user_id', user.id)
        .order('meeting(scheduled_time)', { ascending: true });

      if (error) throw error;

      // Vérifier si nous avons des données
      if (!data || data.length === 0) return [];

      // Récupérer tous les participants pour chaque réunion
      const meetingIds = [...new Set(data.map(item => (item.meeting as any).id))];
      const { data: allParticipants, error: participantsError } = await supabase
        .from('video_meeting_participants')
        .select(`
          id, user_id, meeting_id, role, status, joined_at
        `)
        .in('meeting_id', meetingIds);

      if (participantsError) throw participantsError;

      // Get user information separately
      const userIds = allParticipants?.map(p => p.user_id) || [];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, first_name, last_name, email')
        .in('user_id', userIds);
        
      if (profilesError) throw profilesError;
      
      // Create a map of user_id to profile data
      const profilesMap = new Map();
      profilesData?.forEach(profile => {
        profilesMap.set(profile.user_id, profile);
      });
      
      // Organiser les participants par réunion
      const participantsByMeeting: Record<string, any[]> = {};
      if (allParticipants) {
        allParticipants.forEach(p => {
          if (!participantsByMeeting[p.meeting_id]) {
            participantsByMeeting[p.meeting_id] = [];
          }
          // Add profile data to participant object
          const profile = profilesMap.get(p.user_id);
          participantsByMeeting[p.meeting_id].push({
            ...p,
            profile
          });
        });
      }

      return data.map(item => {
        const meeting = item.meeting as any;
        return {
          id: meeting.id,
          title: meeting.title,
          roomId: meeting.room_id,
          description: meeting.description,
          scheduledTime: meeting.scheduled_time ? new Date(meeting.scheduled_time) : undefined,
          isInstant: meeting.is_instant,
          status: meeting.status,
          createdBy: meeting.created_by,
          createdAt: new Date(meeting.created_at),
          participants: (participantsByMeeting[meeting.id] || []).map(p => ({
            id: p.id,
            userId: p.user_id,
            meetingId: p.meeting_id,
            name: `${p.profile?.first_name || ''} ${p.profile?.last_name || ''}`.trim() || p.profile?.email || 'Utilisateur inconnu',
            email: p.profile?.email || '',
            role: p.role,
            status: p.status,
            joinedAt: p.joined_at ? new Date(p.joined_at) : undefined
          }))
        };
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des réunions utilisateur:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de récupérer vos réunions',
        variant: 'destructive'
      });
      return [];
    } finally {
      setLoading(false);
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
    }
  ): Promise<string | null> => {
    if (!user) return null;
    setLoading(true);
    try {
      // Make room ID more unique and structured to avoid conflicts
      const orgPrefix = 'aphs-private'; // Organization-specific prefix
      const timestamp = Date.now();
      const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase(); // Longer, uppercase random string
      const userFragment = user.id.substring(0, 5); // Shorter user ID fragment
      
      // Ensure room name has no spaces and is unique
      // Format: orgPrefix_timestamp_userFragment_randomPart
      const roomId = `${orgPrefix}_${timestamp}_${userFragment}_${randomPart}`;
      
      // Insérer la réunion
      const { data, error } = await supabase
        .from('video_meetings')
        .insert({
          title,
          room_id: roomId,
          description: options?.description,
          scheduled_time: options?.scheduledTime?.toISOString(),
          is_instant: options?.isInstant || false,
          status: options?.isInstant ? 'active' : 'scheduled',
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      // Ajouter le créateur comme hôte
      const { error: hostError } = await supabase
        .rpc('add_meeting_participant', {
          p_meeting_id: data.id,
          p_user_id: user.id,
          p_role: 'host',
          p_status: 'accepted'
        });

      if (hostError) throw hostError;

      // Ajouter les participants
      if (participants.length > 0) {
        for (const userId of participants) {
          // Add participants one by one to avoid batch failures
          const { error: participantError } = await supabase
            .rpc('add_meeting_participant', {
              p_meeting_id: data.id,
              p_user_id: userId,
              p_role: 'participant',
              p_status: 'invited'
            });
            
          if (participantError) {
            console.error(`Error adding participant ${userId}:`, participantError);
            // Continue adding other participants even if one fails
          }
        }
      }

      toast({
        title: 'Succès',
        description: options?.isInstant ? 'Réunion créée et démarrée' : 'Réunion programmée avec succès'
      });

      // Envoyer des notifications aux participants invités
      if (participants.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', participants);

        const userName = user.user_metadata?.first_name && user.user_metadata?.last_name 
          ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
          : user.email;

        // Utiliser les fonctions de notification
        for (const participant of participants) {
          try {
            await supabase.rpc('send_meeting_invitation_notification', {
              p_participant_id: participant,
              p_meeting_title: title,
              p_organizer_name: userName || 'Un organisateur',
              p_scheduled_time: options?.scheduledTime?.toISOString() || new Date().toISOString()
            });
          } catch (notificationError) {
            console.error('Erreur lors de l\'envoi de notification:', notificationError);
          }
        }
      }

      return data.id;
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

  // Rejoindre une réunion
  const joinMeeting = useCallback(async (meetingId: string): Promise<{ roomId: string, isModerator: boolean } | null> => {
    if (!user) return null;
    setLoading(true);
    try {
      // D'abord, récupérer la réunion pour vérifier si l'utilisateur est l'hôte
      const { data: meetingData, error: meetingError } = await supabase
        .from('video_meetings')
        .select('id, room_id, created_by, status')
        .eq('id', meetingId)
        .single();
        
      if (meetingError) throw meetingError;
      
      // Récupérer le profil pour vérifier si l'utilisateur est admin
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();
        
      if (profileError) {
        console.warn('Erreur lors de la récupération du profil:', profileError);
      }
      
      // Vérifier si l'utilisateur est un hôte ou le créateur
      const { data: participantData, error: participantError } = await supabase
        .from('video_meeting_participants')
        .select('role')
        .eq('meeting_id', meetingId)
        .eq('user_id', user.id)
        .maybeSingle();
      
      // Plusieurs façons de déterminer si l'utilisateur est modérateur
      const isCreator = meetingData.created_by === user.id;
      const isHost = participantData?.role === 'host';
      
      // Vérifier si l'utilisateur est admin dans Supabase ou via les metadata
      const isAdminInProfile = userProfile?.role === 'admin';
      const isAdminInMetadata = user.user_metadata?.role === 'admin';
      const isAdmin = isAdminInProfile || isAdminInMetadata;
      
      const isModerator = isCreator || isHost || isAdmin;
        
      console.log(`Joining meeting: ${meetingId}, User is creator: ${isCreator}, host: ${isHost}, admin: ${isAdmin}, isModerator: ${isModerator}`);
      
      // Mettre à jour le statut du participant même si le user est le créateur/hôte
      const { error: joinError } = await supabase
        .rpc('safe_join_meeting', {
          p_meeting_id: meetingId,
          p_user_id: user.id
        });

      if (joinError) {
        console.error('Database error while joining meeting:', joinError);
        throw new Error(`Erreur de base de données: ${joinError.message}`);
      }
      
      // Si l'utilisateur est un modérateur (admin ou créateur), nous n'avons pas besoin de vérifier davantage
      if (isModerator) {
        console.log('User is moderator, providing direct access to room');
        return { 
          roomId: meetingData.room_id,
          isModerator: true
        };
      }
      
      // Pour les non-modérateurs, vérifier si la réunion est active 
      // (ce qui signifie qu'un hôte est présent ou s'est connecté récemment)
      if (meetingData.status !== 'active') {
        console.log('Meeting is not active and user is not a moderator');
        throw new Error('L\'hôte n\'a pas encore démarré cette réunion. Veuillez réessayer plus tard.');
      }
      
      return { 
        roomId: meetingData.room_id,
        isModerator: false
      };
    } catch (error: any) {
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

  // Terminer une réunion en cours
  const endMeeting = useCallback(async (meetingId: string): Promise<boolean> => {
    if (!user) return false;
    setLoading(true);
    try {
      // Vérifier que l'utilisateur est autorisé à terminer la réunion (créateur ou hôte)
      const { data: meeting, error: meetingError } = await supabase
        .from('video_meetings')
        .select('id, created_by, status')
        .eq('id', meetingId)
        .single();

      if (meetingError) throw meetingError;

      // Vérifier si la réunion est déjà terminée
      if (meeting.status === 'ended' || meeting.status === 'cancelled') {
        toast({
          title: 'Information',
          description: 'Cette réunion est déjà terminée'
        });
        return true;
      }

      // Vérifier si l'utilisateur est le créateur ou un hôte de la réunion
      const isCreator = meeting.created_by === user.id;
      
      if (!isCreator) {
        const { data: participant, error: participantError } = await supabase
          .from('video_meeting_participants')
          .select('role')
          .eq('meeting_id', meetingId)
          .eq('user_id', user.id)
          .single();

        if (participantError || participant.role !== 'host') {
          toast({
            title: 'Accès refusé',
            description: 'Vous n\'êtes pas autorisé à terminer cette réunion',
            variant: 'destructive'
          });
          return false;
        }
      }

      // Mettre à jour le statut de la réunion
      await supabase
        .from('video_meetings')
        .update({ 
          status: 'ended',
          ended_at: new Date().toISOString()
        })
        .eq('id', meetingId);

      toast({
        title: 'Succès',
        description: 'La réunion a été terminée avec succès'
      });

      return true;
    } catch (error) {
      console.error('Erreur lors de la fermeture de la réunion:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de terminer la réunion',
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, supabase, toast]);

  // Soumettre une demande de réunion (pour non-admins)
  const requestMeeting = useCallback(async (
    title: string,
    description: string,
    scheduledTime: Date,
    suggestedParticipants: string[]
  ): Promise<boolean> => {
    if (!user) return false;
    setLoading(true);
    try {
      // Insérer la demande
      const { data, error } = await supabase
        .from('video_meeting_requests')
        .insert({
          title,
          description,
          requested_by: user.id,
          scheduled_time: scheduledTime.toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Ajouter les participants suggérés
      if (suggestedParticipants.length > 0) {
        const participantsData = suggestedParticipants.map(userId => ({
          request_id: data.id,
          user_id: userId
        }));

        const { error: participantsError } = await supabase
          .from('video_meeting_request_participants')
          .insert(participantsData);

        if (participantsError) throw participantsError;
      }

      toast({
        title: 'Succès',
        description: 'Demande de réunion envoyée'
      });

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

  // Récupérer les demandes de réunion (pour admin)
  const getMeetingRequests = useCallback(async (): Promise<MeetingRequest[]> => {
    if (!user) return [];
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('video_meeting_requests')
        .select(`
          *,
          requester:profiles!video_meeting_requests_requested_by_fkey(first_name, last_name, email),
          participants:video_meeting_request_participants(
            id, user_id,
            user:profiles(user_id, first_name, last_name, email)
          )
        `)
        .order('requested_time', { ascending: false });

      if (error) throw error;

      return (data || []).map(request => ({
        id: request.id,
        title: request.title,
        description: request.description,
        requestedBy: request.requested_by,
        requestedByName: `${request.requester?.first_name || ''} ${request.requester?.last_name || ''}`.trim() || request.requester?.email || 'Utilisateur inconnu',
        status: request.status,
        requestedTime: new Date(request.requested_time),
        scheduledTime: request.scheduled_time ? new Date(request.scheduled_time) : undefined,
        suggestedParticipants: (request.participants || []).map(p => ({
          id: p.id,
          userId: p.user_id,
          name: `${p.user?.first_name || ''} ${p.user?.last_name || ''}`.trim() || p.user?.email || 'Utilisateur inconnu'
        }))
      }));
    } catch (error) {
      console.error('Erreur lors de la récupération des demandes de réunion:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de récupérer les demandes de réunion',
        variant: 'destructive'
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [user, supabase, toast]);

  // Répondre à une demande de réunion (pour admin)
  const respondToMeetingRequest = useCallback(async (
    requestId: string,
    isApproved: boolean,
    message?: string
  ): Promise<boolean> => {
    if (!user) return false;
    setLoading(true);
    try {
      // Mettre à jour la demande
      const { data, error } = await supabase
        .from('video_meeting_requests')
        .update({
          status: isApproved ? 'approved' : 'rejected',
          response_message: message,
          responded_at: new Date().toISOString(),
          responded_by: user.id
        })
        .eq('id', requestId)
        .select('*, participants:video_meeting_request_participants(user_id)')
        .single();

      if (error) throw error;

      // Si approuvée, créer la réunion
      if (isApproved) {
        const participantIds = (data.participants || []).map((p: any) => p.user_id);
        // Ajouter l'auteur de la demande
        if (!participantIds.includes(data.requested_by)) {
          participantIds.push(data.requested_by);
        }

        const meetingId = await createMeeting(
          data.title,
          participantIds,
          {
            description: data.description,
            scheduledTime: data.scheduled_time ? new Date(data.scheduled_time) : undefined
          }
        );

        if (!meetingId) {
          throw new Error('Impossible de créer la réunion');
        }
      }

      toast({
        title: 'Succès',
        description: `Demande de réunion ${isApproved ? 'approuvée' : 'refusée'}`
      });

      return true;
    } catch (error) {
      console.error('Erreur lors de la réponse à la demande:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de traiter la demande de réunion',
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, supabase, toast, createMeeting]);

  // Charger les réunions
  useEffect(() => {
    const loadMeetings = async () => {
      setLoadingMeetings(true);
      try {
        // Vérifier si l'utilisateur est admin en utilisant son rôle dans profiles
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user?.id)
          .single();
          
        const isAdmin = profileData?.role === 'admin';
        
        const meetingsData = isAdmin 
          ? await getAllMeetings() 
          : await getUserMeetings();
          
        setMeetings(meetingsData);
      } catch (error) {
        console.error("Erreur lors du chargement des réunions:", error);
      } finally {
        setLoadingMeetings(false);
      }
    };
    
    if (user) {
      loadMeetings();
    }
    // Charger aussi la liste des utilisateurs pour les invitations
    // TODO: Implémenter cette partie
  }, [getAllMeetings, getUserMeetings, supabase, user]);

  return {
    loading,
    loadingMeetings,
    meetings,
    getAllMeetings,
    getUserMeetings,
    createMeeting,
    joinMeeting,
    endMeeting,
    requestMeeting,
    getMeetingRequests,
    respondToMeetingRequest
  };
} 