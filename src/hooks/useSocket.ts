import { useEffect, useRef, useState } from 'react';
import { useSupabase } from './useSupabase';

interface UseSocketProps {
  roomId: string;
  userName: string;
  userId: string;
}

export interface SocketMessage {
  type: 'signal' | 'join' | 'leave' | 'chat' | 'recording-start' | 'recording-stop';
  data: any;
  from: string;
  to?: string;
  timestamp: number;
}

export function useSocket({ roomId, userName, userId }: UseSocketProps) {
  const { supabase } = useSupabase();
  const channelRef = useRef<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState<string[]>([]);
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    console.log(`🔌 Initializing socket for room: ${roomId}, user: ${userName} (${userId})`);
    
    // Créer un channel Supabase Realtime pour la room
    const channel = supabase.channel(`video-room-${roomId}`, {
      config: {
        broadcast: { self: true },
        presence: { key: userId }
      }
    });

    channelRef.current = channel;

    // Écouter les présences (participants qui entrent/sortent)
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const participantIds = Object.keys(state).filter(id => id !== userId);
        console.log(`👥 Participants in room: ${participantIds.length}`, participantIds);
        setParticipants(participantIds);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (key !== userId) {
          console.log(`👋 User joined: ${key}`);
          setParticipants(prev => {
            if (!prev.includes(key)) {
              return [...prev, key];
            }
            return prev;
          });
        }
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log(`👋 User left: ${key}`);
        setParticipants(prev => prev.filter(id => id !== key));
      })
      // Écouter les signaux WebRTC
      .on('broadcast', { event: 'webrtc-signal' }, (payload) => {
        const { signal, from, to } = payload.payload;
        if (to === userId && from !== userId) {
          console.log(`📡 Received WebRTC signal from: ${from}`);
          if (signalCallbacks.current) {
            signalCallbacks.current({ signal, from, to });
          }
        }
      })
      // Écouter les messages de chat
      .on('broadcast', { event: 'chat-message' }, (payload) => {
        const { message, userName: senderName, from, timestamp } = payload.payload;
        if (from !== userId) {
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
          console.log('✅ Connected to video room');
          setIsConnected(true);
          
          // Annoncer sa présence
          await channel.track({
            userId,
            userName,
            joinedAt: new Date().toISOString()
          });
        }
      });

    return () => {
      console.log('🔌 Cleaning up socket connection');
      channel.unsubscribe();
      setIsConnected(false);
      setParticipants([]);
    };
  }, [roomId, userName, userId, supabase]);

  const signalCallbacks = useRef<((data: any) => void) | null>(null);

  const sendSignal = (signal: any, targetUserId?: string) => {
    if (channelRef.current && isConnected) {
      console.log(`📡 Sending WebRTC signal to: ${targetUserId}`);
      channelRef.current.send({
        type: 'broadcast',
        event: 'webrtc-signal',
        payload: {
          signal,
          from: userId,
          to: targetUserId,
          roomId
        }
      });
    }
  };

  const sendChatMessage = (message: string) => {
    if (channelRef.current && isConnected) {
      const timestamp = Date.now();
      
      // Diffuser le message
      channelRef.current.send({
        type: 'broadcast',
        event: 'chat-message',
        payload: {
          message,
          userName,
          from: userId,
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
    }
  };

  const onSignal = (callback: (data: any) => void) => {
    signalCallbacks.current = callback;
    return () => {
      signalCallbacks.current = null;
    };
  };

  return {
    isConnected,
    participants,
    messages,
    sendSignal,
    sendChatMessage,
    onSignal
  };
} 