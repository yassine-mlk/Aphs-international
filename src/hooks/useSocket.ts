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
  const supabaseHook = useSupabase();
  const supabase = supabaseHook?.supabase;
  const channelRef = useRef<any>(null);
  const socketRef = useRef<any>(null);
  const signalCallbacks = useRef<((data: any) => void) | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState<string[]>([]);
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    console.log(`🔌 Initializing socket for room: ${roomId}, user: ${userName} (${userId})`);
    
    // Mode de fallback : utiliser localStorage si Realtime ne fonctionne pas
    const useRealtimeFallback = import.meta.env.VITE_USE_REALTIME !== 'false';
    
    if (useRealtimeFallback && supabase) {
      try {
        // Tenter d'utiliser Supabase Realtime
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

      } catch (error) {
        console.error('❌ Realtime failed, falling back to localStorage:', error);
        // Fallback vers localStorage en cas d'erreur
      }
    }

    // Mode FALLBACK : localStorage (comme avant)
    console.log('📱 Using localStorage fallback mode for room communication');
    
    const simulatedSocket = {
      emit: (event: string, data: any) => {
        try {
          const key = `socket_${roomId}_${event}`;
          const existing = JSON.parse(localStorage.getItem(key) || '[]');
          const message = {
            ...data,
            from: userId,
            timestamp: Date.now()
          };
          existing.push(message);
          localStorage.setItem(key, JSON.stringify(existing));
          
          // Déclencher un événement pour les autres onglets/utilisateurs
          window.dispatchEvent(new CustomEvent('socket-message', {
            detail: { event, data: message, roomId }
          }));
        } catch (error) {
          console.error('Error in socket emit:', error);
        }
      },
      
      on: (event: string, callback: (data: any) => void) => {
        const handleMessage = (e: any) => {
          try {
            if (e.detail?.event === event && e.detail?.roomId === roomId) {
              const message = e.detail.data;
              if (message?.from !== userId) {
                callback(message);
              }
            }
          } catch (error) {
            console.error('Error in socket message handler:', error);
          }
        };
        window.addEventListener('socket-message', handleMessage);
        return () => window.removeEventListener('socket-message', handleMessage);
      },
      
      join: (room: string) => {
        console.log(`Joining room: ${room}`);
        setIsConnected(true);
      },
      
      leave: (room: string) => {
        console.log(`Leaving room: ${room}`);
        setIsConnected(false);
      }
    };

    socketRef.current = simulatedSocket as any;

    // Rejoindre la room
    simulatedSocket.join(roomId);
    
    // Annoncer sa présence
    simulatedSocket.emit('join', {
      roomId,
      userName,
      userId
    });

    // Écouter les événements
    const cleanupJoin = simulatedSocket.on('join', (data) => {
      if (data?.userId && data.userId !== userId) {
        setParticipants(prev => {
          if (!prev.includes(data.userId)) {
            return [...prev, data.userId];
          }
          return prev;
        });
      }
    });

    const cleanupLeave = simulatedSocket.on('leave', (data) => {
      if (data?.userId) {
        setParticipants(prev => prev.filter(id => id !== data.userId));
      }
    });

    const cleanupChat = simulatedSocket.on('chat', (data) => {
      if (data?.message && data?.userName) {
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: data.message,
          sender: data.userName,
          timestamp: data.timestamp || Date.now(),
          isOwn: false
        }]);
      }
    });

    const cleanupSignal = simulatedSocket.on('signal', (data) => {
      if (data?.to === userId && data?.signal && signalCallbacks.current) {
        console.log(`📡 Received WebRTC signal from: ${data.from} (localStorage)`);
        signalCallbacks.current({ 
          signal: data.signal, 
          from: data.from, 
          to: data.to 
        });
      }
    });

    return () => {
      try {
        // Annoncer le départ
        simulatedSocket.emit('leave', {
          roomId,
          userName,
          userId
        });
        
        cleanupJoin();
        cleanupLeave();
        cleanupChat();
        cleanupSignal();
        simulatedSocket.leave(roomId);
      } catch (error) {
        console.error('Error in socket cleanup:', error);
      }
    };
  }, [roomId, userName, userId]);

  const sendSignal = (signal: any, targetUserId?: string) => {
    try {
      if (socketRef.current && isConnected) {
        console.log(`📡 Sending WebRTC signal to: ${targetUserId} (localStorage)`);
        socketRef.current.emit('signal', {
          signal,
          to: targetUserId,
          roomId
        });
      }
    } catch (error) {
      console.error('Error sending signal:', error);
    }
  };

  const sendChatMessage = (message: string) => {
    try {
      const timestamp = Date.now();
      
      if (socketRef.current && isConnected) {
        // Mode localStorage
        socketRef.current.emit('chat', {
          message,
          userName,
          roomId,
          timestamp
        });
      }
      
      // Ajouter le message à notre liste locale
      setMessages(prev => [...prev, {
        id: timestamp,
        text: message,
        sender: userName,
        timestamp,
        isOwn: true
      }]);
    } catch (error) {
      console.error('Error sending chat message:', error);
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