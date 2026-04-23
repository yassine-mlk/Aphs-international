import { useCallback, useState, useEffect, useRef } from 'react';
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
  const { notifyMeetingStarted } = useNotificationTriggers();
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
        .select('user_id, first_name, last_name, email')
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
        .select('user_id, first_name, last_name, email')
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
      // Nom de salle ultra-simple : juste des lettres et chiffres, aucun préfixe
      const randomId = Math.random().toString(36).substring(2, 15); // Long random string
      const roomId = `meet${randomId}`; // Format: meet + random (ex: meetabc123def456)
      
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
          .select('user_id, first_name, last_name, email')
          .in('user_id', participants);

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
          }
        }
      }

      return data.id;
    } catch (error) {
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

  // Vérifier si un utilisateur peut voir une réunion (front-end seulement)
  const canViewMeeting = useCallback((meeting: VideoMeeting): boolean => {
    if (!user) return false;
    
    // L'admin et le créateur peuvent toujours voir
    const isAdmin = user.user_metadata?.role === 'admin';
    const isCreator = meeting.createdBy === user.id;
    if (isAdmin || isCreator) return true;
    
    // Vérifier si l'utilisateur est dans la liste des participants
    return meeting.participants.some(p => p.userId === user.id);
  }, [user]);

  // Vérifier si un utilisateur peut rejoindre une réunion (front-end seulement)
  const canJoinMeeting = useCallback((meeting: VideoMeeting): boolean => {
    if (!user) return false;
    
    // L'admin et le créateur peuvent toujours rejoindre
    const isAdmin = user.user_metadata?.role === 'admin';
    const isCreator = meeting.createdBy === user.id;
    if (isAdmin || isCreator) return true;
    
    // Vérifier si l'utilisateur est participant et a accepté
    const participant = meeting.participants.find(p => p.userId === user.id);
    return participant && participant.status !== 'declined';
  }, [user]);

  // Rejoindre une réunion (version ultra-simplifiée - accès libre côté Jitsi)
  const joinMeeting = useCallback(async (meetingId: string): Promise<{ roomId: string, isModerator: boolean } | null> => {
    if (!user) return null;
    setLoading(true);
    try {
      // Récupérer les informations de base de la réunion
      const { data: meetingData, error: meetingError } = await supabase
        .from('video_meetings')
        .select('room_id, created_by, title')
        .eq('id', meetingId)
        .single();
        
      if (meetingError) throw meetingError;
      
      // Détermination STRICTE du rôle modérateur
      const isCreator = meetingData.created_by === user.id;
      const isRealAdmin = user.user_metadata?.role === 'admin' || 
                         user.email?.toLowerCase() === 'admin@aps.fr' ||
                         user.email?.toLowerCase() === 'admin@aps.com';
      
      // SEULS les créateurs et les vrais admins sont modérateurs
      const isModerator = isCreator || isRealAdmin;
        
      
      // Vérifier si l'utilisateur est déjà participant
      const { data: existingParticipant, error: checkError } = await supabase
        .from('video_meeting_participants')
        .select('id, status')
        .eq('meeting_id', meetingId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkError) {
      }

      if (existingParticipant) {
        // Mettre à jour le statut du participant existant
        await supabase
          .from('video_meeting_participants')
          .update({ 
            status: 'joined',
            joined_at: new Date().toISOString()
          })
          .eq('meeting_id', meetingId)
          .eq('user_id', user.id);
      } else {
        // Ajouter l'utilisateur comme participant s'il n'existe pas
        const participantRole = isModerator ? 'host' : 'participant';
        
        const { error: addParticipantError } = await supabase
          .from('video_meeting_participants')
          .insert({
            meeting_id: meetingId,
            user_id: user.id,
            role: participantRole,
            status: 'joined',
            joined_at: new Date().toISOString()
          });

        if (addParticipantError) {
          // Ne pas empêcher la connexion pour cette erreur
        }
        
      }
      
      // Marquer la réunion comme active
      const { data: updatedMeeting } = await supabase
        .from('video_meetings')
        .update({ status: 'active' })
        .eq('id', meetingId)
        .select()
        .single();
      
      // Notifier les autres participants que la réunion a démarré
      if (updatedMeeting) {
        try {
          // Récupérer les participants de la réunion (excepté l'utilisateur actuel)
          const { data: participants } = await supabase
            .from('video_meeting_participants')
            .select('user_id')
            .eq('meeting_id', meetingId)
            .neq('user_id', user.id);
          
          if (participants && participants.length > 0) {
            // Récupérer le nom de l'organisateur
            const organizerName = user.user_metadata?.first_name && user.user_metadata?.last_name 
              ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
              : user.email || 'Un organisateur';
            
            // Envoyer la notification aux participants
            const participantIds = participants.map(p => p.user_id);
            await notifyMeetingStarted(
              participantIds,
              meetingData.title,
              organizerName,
              meetingId,
              meetingData.room_id
            );
          }
        } catch (notificationError) {
          // Ne pas faire échouer la connexion si les notifications échouent
        }
      }
      
      toast({
        title: 'Réunion rejointe',
        description: `Vous avez rejoint "${meetingData.title}" avec succès${isModerator ? ' (Modérateur)' : ''}`
      });
      
      return { 
        roomId: meetingData.room_id,
        isModerator
      };
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de rejoindre la réunion',
        variant: 'destructive'
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, supabase, toast, notifyMeetingStarted]);

  // Quitter une réunion (sans la terminer - la réunion reste active)
  const leaveMeeting = useCallback(async (meetingId: string): Promise<boolean> => {
    if (!user) return false;
    setLoading(true);
    try {
      
      // Vérifier si le participant existe dans la base de données
      const { data: existingParticipant, error: checkError } = await supabase
        .from('video_meeting_participants')
        .select('id, status, joined_at')
        .eq('meeting_id', meetingId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      if (existingParticipant) {
        // Mettre à jour le participant existant
        const { error: updateError } = await supabase
          .from('video_meeting_participants')
          .update({ 
            left_at: new Date().toISOString(),
            status: 'left'
          })
          .eq('meeting_id', meetingId)
          .eq('user_id', user.id);

        if (updateError) {
          throw updateError;
        }
      } else {
        // Le participant n'existe pas dans la BD, mais ce n'est pas une erreur
        // Il peut avoir rejoint via WebRTC sans être enregistré correctement
      }

      
      toast({
        title: 'Vous avez quitté la réunion',
        description: 'La réunion reste en cours pour les autres participants'
      });

      return true;
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error?.message || 'Impossible de quitter la réunion',
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, supabase, toast]);

  // Terminer une réunion en cours (pour modérateurs uniquement)
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

      // Marquer tous les participants comme ayant quitté
      await supabase
        .from('video_meeting_participants')
        .update({ 
          left_at: new Date().toISOString()
        })
        .eq('meeting_id', meetingId)
        .is('left_at', null);

      toast({
        title: 'Réunion terminée',
        description: 'La réunion a été terminée avec succès'
      });

      return true;
    } catch (error) {
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
  const loadMeetings = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!user?.id) return;
    if (!silent) setLoadingMeetings(true);
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      const isAdmin = profileData?.role === 'admin';

      const meetingsData = isAdmin
        ? await getAllMeetings()
        : await getUserMeetings();

      setMeetings(meetingsData);
    } catch (error) {
    } finally {
      if (!silent) setLoadingMeetings(false);
    }
  }, [getAllMeetings, getUserMeetings, supabase, user?.id]);

  useEffect(() => {
    if (user?.id) {
      loadMeetings();
    }
  }, [user?.id, loadMeetings]);

  // Ref pour stabiliser sans recréer la subscription
  const loadMeetingsRef = useRef(loadMeetings);
  useEffect(() => {
    loadMeetingsRef.current = loadMeetings;
  }, [loadMeetings]);

  // Temps réel avec debounce
  const meetingsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!user?.id) return;

    const scheduleSilentReload = () => {
      if (meetingsTimerRef.current) clearTimeout(meetingsTimerRef.current);
      meetingsTimerRef.current = setTimeout(() => {
        loadMeetingsRef.current({ silent: true });
      }, 600);
    };

    const channel = supabase
      .channel(`video-meetings-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'video_meetings' }, scheduleSilentReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'video_meeting_participants' }, scheduleSilentReload)
      .subscribe();

    return () => {
      if (meetingsTimerRef.current) clearTimeout(meetingsTimerRef.current);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Supprimer définitivement une réunion (admin uniquement)
  const deleteMeeting = useCallback(async (meetingId: string): Promise<boolean> => {
    if (!user) return false;
    setLoading(true);
    try {
      // Vérifier que l'utilisateur est admin ou créateur
      const { data: meeting, error: meetingError } = await supabase
        .from('video_meetings')
        .select('created_by, status')
        .eq('id', meetingId)
        .single();

      if (meetingError) throw meetingError;

      const isAdmin = user.user_metadata?.role === 'admin' || 
                     user.email?.toLowerCase() === 'admin@aps.fr' ||
                     user.email?.toLowerCase() === 'admin@aps.com';
      const isCreator = meeting.created_by === user.id;

      if (!isAdmin && !isCreator) {
        toast({
          title: 'Accès refusé',
          description: 'Vous n\'êtes pas autorisé à supprimer cette réunion',
          variant: 'destructive'
        });
        return false;
      }

      // Supprimer la réunion (CASCADE supprimera automatiquement les participants)
      const { error: deleteError } = await supabase
        .from('video_meetings')
        .delete()
        .eq('id', meetingId);

      if (deleteError) throw deleteError;

      toast({
        title: 'Réunion supprimée',
        description: 'La réunion a été supprimée définitivement'
      });

      return true;
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer la réunion',
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, supabase, toast]);

  // Nettoyer l'historique des réunions terminées (admin uniquement)
  const clearCompletedMeetings = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    setLoading(true);
    try {
      const isAdmin = user.user_metadata?.role === 'admin' || 
                     user.email?.toLowerCase() === 'admin@aps.fr' ||
                     user.email?.toLowerCase() === 'admin@aps.com';

      if (!isAdmin) {
        toast({
          title: 'Accès refusé',
          description: 'Seuls les administrateurs peuvent nettoyer l\'historique',
          variant: 'destructive'
        });
        return false;
      }

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
      toast({
        title: 'Erreur',
        description: 'Impossible de nettoyer l\'historique',
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, supabase, toast]);

  return {
    loading,
    loadingMeetings,
    meetings,
    getAllMeetings,
    getUserMeetings,
    createMeeting,
    joinMeeting,
    leaveMeeting,
    endMeeting,
    deleteMeeting,
    clearCompletedMeetings,
    requestMeeting,
    getMeetingRequests,
    respondToMeetingRequest,
    canViewMeeting,
    canJoinMeeting
  };
} 