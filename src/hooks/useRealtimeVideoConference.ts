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
      return false;
    }

    try {
      
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
      return false;
    }
  }, [isConnected, user?.id, roomId]);

  // Envoyer un message de chat
  const sendChatMessage = useCallback(async (message: string) => {
    if (!channelRef.current || !isConnected) {
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
    }
  }, [channelRef, isConnected, userName, user?.id, roomId]);

  // Initialiser la connexion Supabase Realtime
  useEffect(() => {
    if (!user?.id || !supabase) {
      return;
    }


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
        setParticipants(participantIds);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (key !== user.id) {
          setParticipants(prev => {
            if (!prev.includes(key)) {
              return [...prev, key];
            }
            return prev;
          });
        }
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        setParticipants(prev => prev.filter(id => id !== key));
      })
      // Écouter les signaux WebRTC
      .on('broadcast', { event: 'webrtc-signal' }, (payload) => {
        const { signal, from, to } = payload.payload;
        if (to === user.id && from !== user.id) {
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
        
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          
          // Annoncer sa présence
          await channel.track({
            userId: user.id,
            userName,
            joinedAt: new Date().toISOString()
          });
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setIsConnected(false);
        }
      });

    // Nettoyage à la fermeture
    return () => {
      try {
        if (channel && typeof channel.unsubscribe === 'function') {
          channel.unsubscribe();
        }
      } catch (error) {
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