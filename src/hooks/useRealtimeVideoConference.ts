import { useEffect, useRef, useState, useCallback } from 'react';
import { useSupabase } from './useSupabase';
import { useAuth } from '../contexts/AuthContext';

interface UseRealtimeVideoConferenceProps {
  roomId: string;
  userName: string;
  onSignalReceived?: (data: { signal: any; from: string; to: string }) => void;
}

export function useRealtimeVideoConference({ 
  roomId, 
  userName, 
  onSignalReceived 
}: UseRealtimeVideoConferenceProps) {
  const { user } = useAuth();
  const { supabase } = useSupabase();
  const channelRef = useRef<any>(null);
  const [participants, setParticipants] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);

  // Envoyer un signal WebRTC via Supabase Realtime
  const sendSignal = useCallback(async (signal: any, targetUserId: string) => {
    if (!channelRef.current || !isConnected) {
      console.warn('Cannot send signal - not connected to realtime channel');
      return false;
    }

    try {
      console.log(`📡 Sending WebRTC signal to ${targetUserId} via Supabase Realtime`);
      
      await channelRef.current.send({
        type: 'broadcast',
        event: 'webrtc-signal',
        payload: {
          signal,
          from: user?.id,
          to: targetUserId,
          roomId
        }
      });

      return true;
    } catch (error) {
      console.error('Failed to send signal via Realtime:', error);
      return false;
    }
  }, [isConnected, user?.id, roomId]);

  // Envoyer un message de chat
  const sendChatMessage = useCallback(async (message: string) => {
    if (!channelRef.current || !isConnected) {
      console.warn('Cannot send message - not connected');
      return;
    }

    try {
      const timestamp = Date.now();
      
      await channelRef.current.send({
        type: 'broadcast',
        event: 'chat-message',
        payload: {
          message,
          userName,
          from: user?.id,
          roomId,
          timestamp
        }
      });

      // Ajouter le message à notre liste locale
      setMessages(prev => [...prev, {
        id: timestamp,
        text: message,
        sender: userName,
        timestamp,
        isOwn: true
      }]);
    } catch (error) {
      console.error('Failed to send chat message:', error);
    }
  }, [channelRef, isConnected, userName, user?.id, roomId]);

  // Initialiser la connexion Supabase Realtime
  useEffect(() => {
    if (!user?.id || !supabase) {
      console.warn('Cannot initialize - no user or supabase');
      return;
    }

    console.log(`🔌 Initializing Realtime video conference for room: ${roomId}, user: ${userName}`);

    // Créer un canal Supabase Realtime
    const channel = supabase.channel(`video-conference-${roomId}`, {
      config: {
        broadcast: { self: true },
        presence: { key: user.id }
      }
    });

    channelRef.current = channel;

    // Écouter les présences (participants qui entrent/sortent)
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const participantIds = Object.keys(state).filter(id => id !== user.id);
        console.log(`👥 Participants in room ${roomId}: ${participantIds.length}`, participantIds);
        setParticipants(participantIds);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (key !== user.id) {
          console.log(`👋 User joined room ${roomId}: ${key}`);
          setParticipants(prev => {
            if (!prev.includes(key)) {
              return [...prev, key];
            }
            return prev;
          });
        }
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log(`👋 User left room ${roomId}: ${key}`);
        setParticipants(prev => prev.filter(id => id !== key));
      })
      // Écouter les signaux WebRTC
      .on('broadcast', { event: 'webrtc-signal' }, (payload) => {
        const { signal, from, to } = payload.payload;
        if (to === user.id && from !== user.id) {
          console.log(`📡 Received WebRTC signal from: ${from} via Supabase Realtime`);
          if (onSignalReceived) {
            onSignalReceived({ signal, from, to });
          }
        }
      })
      // Écouter les messages de chat
      .on('broadcast', { event: 'chat-message' }, (payload) => {
        const { message, userName: senderName, from, timestamp } = payload.payload;
        if (from !== user.id) {
          setMessages(prev => [...prev, {
            id: timestamp,
            text: message,
            sender: senderName,
            timestamp,
            isOwn: false
          }]);
        }
      })
      .subscribe(async (status) => {
        console.log(`📡 Supabase Realtime status: ${status}`);
        
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Connected to video conference room: ${roomId}`);
          setIsConnected(true);
          
          // Annoncer sa présence
          await channel.track({
            userId: user.id,
            userName,
            joinedAt: new Date().toISOString()
          });
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.error(`❌ Realtime connection failed: ${status}`);
          setIsConnected(false);
        }
      });

    // Nettoyage à la fermeture
    return () => {
      console.log(`🔌 Cleaning up video conference connection for room: ${roomId}`);
      try {
        if (channel && typeof channel.unsubscribe === 'function') {
          channel.unsubscribe();
        }
      } catch (error) {
        console.warn('Warning during channel cleanup:', error);
      }
      setIsConnected(false);
      setParticipants([]);
    };
  }, [roomId, userName, user?.id, supabase, onSignalReceived]);

  return {
    participants,
    isConnected,
    messages,
    sendSignal,
    sendChatMessage
  };
} 