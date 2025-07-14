import { useCallback, useState, useEffect } from 'react';
import { useSupabase } from './useSupabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { useNotificationTriggers } from './useNotificationTriggers';

export interface MeetingRequest {
  id: string;
  title: string;
  description?: string;
  projectId?: string;
  projectName?: string;
  requestedBy: string;
  requestedByName: string;
  requestedByEmail: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedTime: Date;
  scheduledTime?: Date;
  responseMessage?: string;
  suggestedParticipants: {
    id: string;
    userId: string;
    name: string;
    email: string;
  }[];
  createdAt: Date;
}

export function useVideoMeetingRequests() {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const { toast } = useToast();
  const { notifyMeetingRequestResponse } = useNotificationTriggers();
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<MeetingRequest[]>([]);

  // Vérifier si l'utilisateur est admin
  const isAdmin = user?.user_metadata?.role === 'admin' || user?.email === 'admin@aphs.com';

  // Récupérer les demandes de réunion
  const getMeetingRequests = useCallback(async (): Promise<MeetingRequest[]> => {
    if (!user) return [];
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('video_meeting_requests')
        .select(`
          id, title, description, project_id, status, scheduled_time, 
          response_message, created_at,
          requester:profiles!video_meeting_requests_requested_by_fkey(
            user_id, first_name, last_name, email
          ),
          project:projects(name),
          participants:video_meeting_request_participants(
            id, user_id,
            participant:profiles!video_meeting_request_participants_user_id_fkey(
              user_id, first_name, last_name, email
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedRequests: MeetingRequest[] = (data || []).map(request => {
        const requester = Array.isArray(request.requester) ? request.requester[0] : request.requester;
        const project = Array.isArray(request.project) ? request.project[0] : request.project;
        
        return {
          id: request.id,
          title: request.title,
          description: request.description,
          projectId: request.project_id,
          projectName: project?.name,
          requestedBy: requester?.user_id,
          requestedByName: `${requester?.first_name || ''} ${requester?.last_name || ''}`.trim() || requester?.email || 'Utilisateur inconnu',
          requestedByEmail: requester?.email || '',
          status: request.status,
          requestedTime: new Date(request.created_at),
          scheduledTime: request.scheduled_time ? new Date(request.scheduled_time) : undefined,
          responseMessage: request.response_message,
          suggestedParticipants: request.participants.map(p => {
            const participant = Array.isArray(p.participant) ? p.participant[0] : p.participant;
            return {
              id: p.id,
              userId: participant?.user_id || '',
              name: `${participant?.first_name || ''} ${participant?.last_name || ''}`.trim() || participant?.email || 'Utilisateur inconnu',
              email: participant?.email || ''
            };
          }),
          createdAt: new Date(request.created_at)
        };
      });

      setRequests(formattedRequests);
      return formattedRequests;
    } catch (error) {
      console.error('Erreur lors de la récupération des demandes:', error);
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

  // Répondre à une demande de réunion
  const respondToMeetingRequest = useCallback(async (
    requestId: string,
    approved: boolean,
    responseMessage?: string,
    scheduledTime?: Date,
    selectedParticipants?: string[]
  ): Promise<boolean> => {
    if (!user || !isAdmin) return false;
    setLoading(true);

    try {
      // Récupérer les détails de la demande pour les notifications
      const { data: requestData, error: fetchError } = await supabase
        .from('video_meeting_requests')
        .select(`
          title, requested_by,
          requester:profiles!video_meeting_requests_requested_by_fkey(
            first_name, last_name, email
          )
        `)
        .eq('id', requestId)
        .single();

      if (fetchError) throw fetchError;

      const requester = Array.isArray(requestData.requester) ? requestData.requester[0] : requestData.requester;

      // Mettre à jour le statut de la demande
      const updateData: any = {
        status: approved ? 'approved' : 'rejected',
        response_message: responseMessage,
        responded_by: user.id,
        responded_at: new Date().toISOString()
      };

      if (approved && scheduledTime) {
        updateData.scheduled_time = scheduledTime.toISOString();
      }

      const { error: updateError } = await supabase
        .from('video_meeting_requests')
        .update(updateData)
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Si approuvé, créer la réunion
      if (approved) {
        const { data: meeting, error: meetingError } = await supabase
          .from('video_meetings')
          .insert({
            title: requestData.title,
            description: `Réunion demandée par ${requester?.first_name || ''} ${requester?.last_name || ''}`.trim() || 'Utilisateur',
            scheduled_time: scheduledTime?.toISOString(),
            created_by: user.id,
            status: 'scheduled',
            is_instant: false
          })
          .select()
          .single();

        if (meetingError) throw meetingError;

        // Utiliser les participants sélectionnés par l'admin ou récupérer ceux suggérés
        let participantIds: string[] = [];
        
        if (selectedParticipants && selectedParticipants.length > 0) {
          // Utiliser les participants sélectionnés par l'admin
          participantIds = selectedParticipants;
        } else {
          // Fallback: utiliser les participants suggérés (pour rétrocompatibilité)
          const { data: suggestedParticipants } = await supabase
            .from('video_meeting_request_participants')
            .select('user_id')
            .eq('request_id', requestId);

          participantIds = suggestedParticipants?.map(p => p.user_id) || [];
        }

        // Ajouter les participants à la réunion
        for (const participantId of participantIds) {
          await supabase
            .from('video_meeting_participants')
            .insert({
              meeting_id: meeting.id,
              user_id: participantId,
              role: 'participant',
              status: 'invited'
            });
        }

        // Toujours ajouter le demandeur s'il n'est pas déjà inclus
        if (!participantIds.includes(requestData.requested_by)) {
          await supabase
            .from('video_meeting_participants')
            .insert({
              meeting_id: meeting.id,
              user_id: requestData.requested_by,
              role: 'participant',
              status: 'invited'
            });
        }
      }

      // Envoyer la notification de réponse
      const adminName = `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() || user.email || 'Administrateur';
      await notifyMeetingRequestResponse(
        requestData.requested_by,
        requestData.title,
        approved,
        adminName,
        responseMessage
      );

      toast({
        title: approved ? 'Demande approuvée' : 'Demande refusée',
        description: approved 
          ? 'La réunion a été programmée et les participants notifiés'
          : 'La demande a été refusée et le demandeur notifié'
      });

      // Rafraîchir la liste
      await getMeetingRequests();

      return true;
    } catch (error) {
      console.error('Erreur lors de la réponse à la demande:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de traiter la demande',
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, supabase, toast, notifyMeetingRequestResponse, getMeetingRequests]);

  // Charger les demandes au montage
  useEffect(() => {
    if (user && isAdmin) {
      getMeetingRequests();
    }
  }, [user, isAdmin, getMeetingRequests]);

  return {
    loading,
    requests,
    isAdmin,
    getMeetingRequests,
    respondToMeetingRequest
  };
} 