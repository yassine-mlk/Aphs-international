import { useEffect, useState, useCallback } from 'react';
import { useSupabase } from './useSupabase';
import { useAuth } from '../contexts/AuthContext';

interface Participant {
  user_id: string;
  user_name: string;
  joined_at: string;
  last_seen: string;
}

interface UseRealtimeParticipantsProps {
  roomId: string;
  userName: string;
}

export function useRealtimeParticipants({ roomId, userName }: UseRealtimeParticipantsProps) {
  const { user } = useAuth();
  const { supabase } = useSupabase();
  const [participants, setParticipants] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Vérifier si la table existe
  const [tableExists, setTableExists] = useState(false);

  const checkTableExists = useCallback(async () => {
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .from('meeting_participants_presence')
        .select('count(*)')
        .limit(1);

      if (error && error.message.includes('relation "public.meeting_participants_presence" does not exist')) {
        console.warn('⚠️ Table meeting_participants_presence does not exist. Please create it in your Supabase dashboard.');
        console.info(`
📋 To create the table, run this SQL in your Supabase SQL Editor:

CREATE TABLE IF NOT EXISTS meeting_participants_presence (
    room_id TEXT NOT NULL,
    user_id UUID NOT NULL,
    user_name TEXT NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_meeting_participants_presence_room_id 
ON meeting_participants_presence(room_id);

CREATE INDEX IF NOT EXISTS idx_meeting_participants_presence_last_seen 
ON meeting_participants_presence(last_seen);

ALTER TABLE meeting_participants_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all participants in a room" ON meeting_participants_presence
    FOR SELECT USING (true);

CREATE POLICY "Users can manage their own presence" ON meeting_participants_presence
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own presence" ON meeting_participants_presence
    FOR INSERT WITH CHECK (auth.uid() = user_id);
        `);
        setTableExists(false);
        return false;
      } else {
        setTableExists(true);
        return true;
      }
    } catch (error) {
      console.error('❌ Error checking table existence:', error);
      setTableExists(false);
      return false;
    }
  }, [supabase]);

  // Rejoindre la room en enregistrant sa présence en base
  const joinRoom = useCallback(async () => {
    if (!user?.id || !supabase || !tableExists) {
      if (!tableExists) {
        console.log('🔄 Using fallback mode - table does not exist');
        setIsConnected(true);
      }
      return;
    }

    try {
      // Insérer ou mettre à jour la présence de l'utilisateur
      const { error } = await supabase
        .from('meeting_participants_presence')
        .upsert({
          room_id: roomId,
          user_id: user.id,
          user_name: userName,
          joined_at: new Date().toISOString(),
          last_seen: new Date().toISOString()
        }, {
          onConflict: 'room_id,user_id'
        });

      if (error) {
        console.error('Error joining room:', error);
        return;
      }

      console.log(`✅ Joined room ${roomId} as ${userName}`);
      setIsConnected(true);
    } catch (error) {
      console.error('Failed to join room:', error);
    }
  }, [roomId, userName, user?.id, supabase, tableExists]);

  // Quitter la room
  const leaveRoom = useCallback(async () => {
    if (!user?.id || !supabase || !tableExists) return;

    try {
      const { error } = await supabase
        .from('meeting_participants_presence')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error leaving room:', error);
        return;
      }

      console.log(`👋 Left room ${roomId}`);
      setIsConnected(false);
    } catch (error) {
      console.error('Failed to leave room:', error);
    }
  }, [roomId, user?.id, supabase, tableExists]);

  // Mettre à jour le heartbeat
  const updateHeartbeat = useCallback(async () => {
    if (!user?.id || !supabase || !isConnected || !tableExists) return;

    try {
      const { error } = await supabase
        .from('meeting_participants_presence')
        .update({
          last_seen: new Date().toISOString()
        })
        .eq('room_id', roomId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating heartbeat:', error);
      }
    } catch (error) {
      console.error('Failed to update heartbeat:', error);
    }
  }, [roomId, user?.id, supabase, isConnected, tableExists]);

  // Récupérer la liste des participants
  const fetchParticipants = useCallback(async () => {
    if (!supabase || !tableExists) return;

    try {
      // Supprimer les participants inactifs (plus de 30 secondes sans heartbeat)
      const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();
      await supabase
        .from('meeting_participants_presence')
        .delete()
        .eq('room_id', roomId)
        .lt('last_seen', thirtySecondsAgo);

      // Récupérer les participants actifs
      const { data, error } = await supabase
        .from('meeting_participants_presence')
        .select('user_id, user_name')
        .eq('room_id', roomId);

      if (error) {
        console.error('Error fetching participants:', error);
        return;
      }

      const participantIds = data
        ?.filter(p => p.user_id !== user?.id)
        ?.map(p => p.user_id) || [];

      setParticipants(participantIds);
      console.log(`👥 Room ${roomId} has ${participantIds.length} other participants:`, participantIds);
    } catch (error) {
      console.error('Failed to fetch participants:', error);
    }
  }, [roomId, user?.id, supabase, tableExists]);

  // Initialiser et nettoyer
  useEffect(() => {
    if (!user?.id) return;

    console.log(`🔌 Initializing realtime participants for room: ${roomId}`);

    // Vérifier l'existence de la table d'abord
    checkTableExists().then((exists) => {
      if (exists) {
        // Rejoindre la room
        joinRoom();
      } else {
        console.log('📋 Table does not exist, using fallback mode');
        setIsConnected(true);
      }
    });

    // Mettre à jour le heartbeat toutes les 10 secondes
    const heartbeatInterval = setInterval(updateHeartbeat, 10000);

    // Récupérer les participants toutes les 5 secondes
    const participantsInterval = setInterval(fetchParticipants, 5000);

    // Récupération initiale
    setTimeout(fetchParticipants, 1000);

    // Nettoyage à la fermeture
    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(participantsInterval);
      leaveRoom();
    };
  }, [roomId, user?.id]);

  // Nettoyer à la fermeture de la page
  useEffect(() => {
    const handleBeforeUnload = () => {
      leaveRoom();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [leaveRoom]);

  return {
    participants,
    isConnected,
    joinRoom,
    leaveRoom,
    updateHeartbeat
  };
} 