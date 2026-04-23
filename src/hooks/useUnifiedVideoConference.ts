import { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface VideoMeeting {
  id: string;
  title: string;
  room_id: string;
  description?: string;
  scheduled_time?: string;
  is_instant: boolean;
  status: 'scheduled' | 'active' | 'ended';
  created_by: string;
  created_at: string;
  ended_at?: string;
  recording_available?: boolean;
}

export interface MeetingParticipant {
  id: string;
  meeting_id: string;
  user_id: string;
  joined_at?: string;
  left_at?: string;
  role: 'host' | 'participant';
}

export const useUnifiedVideoConference = () => {
  const [loading, setLoading] = useState(false);
  const [meetings, setMeetings] = useState<VideoMeeting[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [currentMeeting, setCurrentMeeting] = useState<VideoMeeting | null>(null);
  const [participants, setParticipants] = useState<MeetingParticipant[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isInMeeting, setIsInMeeting] = useState(false);
  
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const user = supabase.auth.getUser();

  // Get user role
  const isAdmin = user.data.user?.user_metadata?.role === 'admin' || user.data.user?.email === 'admin@aps.com';

  // Initialize local media stream
  const initializeLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (error) {
      toast.error('Impossible d\'accéder à la caméra et au micro');
      throw error;
    }
  }, []);

  // Create WebRTC peer connection
  const createPeerConnection = useCallback((userId: string) => {
    const config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    const pc = new RTCPeerConnection(config);
    peerConnections.current.set(userId, pc);

    // Add local stream to peer connection
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      setRemoteStreams(prev => new Map(prev.set(userId, event.streams[0])));
    };

    // Handle ICE candidates
    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        // Send ICE candidate through signaling
        await sendSignalingMessage({
          type: 'ice-candidate',
          candidate: event.candidate,
          userId
        });
      }
    };

    return pc;
  }, [localStream]);

  // Send signaling message (would integrate with WebSocket/Supabase Realtime)
  const sendSignalingMessage = async (message: any) => {
    // This would integrate with your signaling server
    console.log('Signaling message:', message);
  };

  // Create a new meeting
  const createMeeting = useCallback(async (
    title: string, 
    participantIds: string[], 
    options?: { 
      description?: string, 
      scheduledTime?: Date, 
      isInstant?: boolean 
    }
  ): Promise<string | null> => {
    try {
      setLoading(true);
      
      const roomId = uuidv4();
      const meetingId = uuidv4();
      const now = new Date();
      
      // Insert the meeting
      const { error: meetingError } = await supabase.from('video_meetings').insert({
        id: meetingId,
        title,
        room_id: roomId,
        description: options?.description || null,
        scheduled_time: options?.scheduledTime?.toISOString() || null,
        is_instant: options?.isInstant ?? true,
        status: options?.isInstant ? 'active' : 'scheduled',
        created_by: user.data.user?.id,
        created_at: now.toISOString()
      });

      if (meetingError) throw meetingError;

      // Add participants
      const participants = [
        { meeting_id: meetingId, user_id: user.data.user?.id, role: 'host' },
        ...participantIds.map(userId => ({
          meeting_id: meetingId,
          user_id: userId,
          role: 'participant'
        }))
      ];

      const { error: participantsError } = await supabase
        .from('video_meeting_participants')
        .insert(participants);

      if (participantsError) throw participantsError;

      toast.success('Réunion créée avec succès');
      await getAllMeetings();
      
      return meetingId;
    } catch (error) {
      console.error('Error creating meeting:', error);
      toast.error('Erreur lors de la création de la réunion');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user.data.user?.id]);

  // Join a meeting
  const joinMeeting = useCallback(async (meetingId: string) => {
    try {
      setLoading(true);
      
      // Initialize local stream
      await initializeLocalStream();
      
      // Update participant status
      await supabase
        .from('video_meeting_participants')
        .update({ joined_at: new Date().toISOString() })
        .eq('meeting_id', meetingId)
        .eq('user_id', user.data.user?.id);

      // Get meeting details
      const { data: meeting } = await supabase
        .from('video_meetings')
        .select('*')
        .eq('id', meetingId)
        .single();

      setCurrentMeeting(meeting);
      setIsInMeeting(true);
      
      toast.success('Vous avez rejoint la réunion');
    } catch (error) {
      console.error('Error joining meeting:', error);
      toast.error('Erreur lors de la rejoindre la réunion');
    } finally {
      setLoading(false);
    }
  }, [user.data.user?.id, initializeLocalStream]);

  // Leave a meeting
  const leaveMeeting = useCallback(async () => {
    try {
      if (currentMeeting) {
        // Update participant status
        await supabase
          .from('video_meeting_participants')
          .update({ left_at: new Date().toISOString() })
          .eq('meeting_id', currentMeeting.id)
          .eq('user_id', user.data.user?.id);
      }

      // Clean up local stream
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      }

      // Clean up peer connections
      peerConnections.current.forEach(pc => pc.close());
      peerConnections.current.clear();
      setRemoteStreams(new Map());

      setCurrentMeeting(null);
      setIsInMeeting(false);
      
      toast.success('Vous avez quitté la réunion');
    } catch (error) {
      console.error('Error leaving meeting:', error);
    }
  }, [currentMeeting, localStream, user.data.user?.id]);

  // End a meeting (host only)
  const endMeeting = useCallback(async (meetingId: string) => {
    try {
      setLoading(true);
      
      // Update meeting status
      await supabase
        .from('video_meetings')
        .update({ 
          status: 'ended', 
          ended_at: new Date().toISOString() 
        })
        .eq('id', meetingId);

      // Update all participants
      await supabase
        .from('video_meeting_participants')
        .update({ left_at: new Date().toISOString() })
        .eq('meeting_id', meetingId)
        .is('null', 'left_at');

      toast.success('Réunion terminée');
      await getAllMeetings();
      
      if (currentMeeting?.id === meetingId) {
        await leaveMeeting();
      }
    } catch (error) {
      console.error('Error ending meeting:', error);
      toast.error('Erreur lors de la terminaison de la réunion');
    } finally {
      setLoading(false);
    }
  }, [currentMeeting, leaveMeeting]);

  // Delete a meeting
  const deleteMeeting = useCallback(async (meetingId: string) => {
    try {
      setLoading(true);
      
      // Delete participants first
      await supabase
        .from('video_meeting_participants')
        .delete()
        .eq('meeting_id', meetingId);

      // Delete meeting
      await supabase
        .from('video_meetings')
        .delete()
        .eq('id', meetingId);

      toast.success('Réunion supprimée');
      await getAllMeetings();
    } catch (error) {
      console.error('Error deleting meeting:', error);
      toast.error('Erreur lors de la suppression de la réunion');
    } finally {
      setLoading(false);
    }
  }, []);

  // Get all meetings (admin only)
  const getAllMeetings = useCallback(async () => {
    if (!isAdmin) return;
    
    try {
      setLoadingMeetings(true);
      
      const { data, error } = await supabase
        .from('video_meetings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMeetings(data || []);
    } catch (error) {
      console.error('Error fetching meetings:', error);
      toast.error('Erreur lors de la récupération des réunions');
    } finally {
      setLoadingMeetings(false);
    }
  }, [isAdmin]);

  // Get user meetings
  const getUserMeetings = useCallback(async () => {
    try {
      setLoadingMeetings(true);
      
      const { data, error } = await supabase
        .from('video_meeting_participants')
        .select(`
          meeting:video_meetings(
            id, title, room_id, description, scheduled_time,
            is_instant, status, created_by, created_at, ended_at, recording_available
          )
        `)
        .eq('user_id', user.data.user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const meetings = data?.map(p => p.meeting).filter(Boolean) || [];
      setMeetings(meetings);
    } catch (error) {
      console.error('Error fetching user meetings:', error);
      toast.error('Erreur lors de la récupération de vos réunions');
    } finally {
      setLoadingMeetings(false);
    }
  }, [user.data.user?.id]);

  // Get meeting recordings
  const getMeetingRecordings = useCallback(async (meetingId: string) => {
    try {
      const { data, error } = await supabase
        .from('video_meeting_recordings')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching recordings:', error);
      toast.error('Erreur lors de la récupération des enregistrements');
      return [];
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    if (isAdmin) {
      getAllMeetings();
    } else {
      getUserMeetings();
    }
  }, [isAdmin, getAllMeetings, getUserMeetings]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      peerConnections.current.forEach(pc => pc.close());
    };
  }, []);

  return {
    // State
    loading,
    loadingMeetings,
    meetings,
    currentMeeting,
    participants,
    localStream,
    remoteStreams,
    isInMeeting,
    isAdmin,
    
    // Refs
    localVideoRef,
    
    // Actions
    createMeeting,
    joinMeeting,
    leaveMeeting,
    endMeeting,
    deleteMeeting,
    getAllMeetings,
    getUserMeetings,
    getMeetingRecordings,
    initializeLocalStream
  };
};
