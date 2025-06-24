import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

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
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState<string[]>([]);
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    // Configuration pour la production ou développement
    const isProduction = import.meta.env.VITE_SOCKET_URL;
    
    if (isProduction) {
      // Mode PRODUCTION avec vrai serveur Socket.IO
      const realSocket = io(import.meta.env.VITE_SOCKET_URL, {
        transports: ['websocket', 'polling']
      });
      
      socketRef.current = realSocket;
      
      // Événements Socket.IO réels
      realSocket.on('connect', () => {
        console.log('🔌 Connecté au serveur Socket.IO');
        setIsConnected(true);
        
        // Rejoindre la room
        realSocket.emit('join', {
          roomId,
          userName,
          userId
        });
      });
      
      realSocket.on('disconnect', () => {
        console.log('🔌 Déconnecté du serveur');
        setIsConnected(false);
        setParticipants([]);
      });
      
      realSocket.on('user-joined', (data) => {
        setParticipants(prev => {
          if (!prev.includes(data.userId)) {
            return [...prev, data.userId];
          }
          return prev;
        });
      });
      
      realSocket.on('user-left', (data) => {
        setParticipants(prev => prev.filter(id => id !== data.userId));
      });
      
      realSocket.on('existing-participants', (participants) => {
        setParticipants(participants.map(p => p.userId));
      });
      
      realSocket.on('chat', (data) => {
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: data.message,
          sender: data.userName,
          timestamp: data.timestamp,
          isOwn: false
        }]);
      });
      
      return () => {
        realSocket.emit('leave', { roomId });
        realSocket.disconnect();
      };
    } else {
      // Mode DÉVELOPPEMENT avec simulation localStorage
      const simulatedSocket = {
        emit: (event: string, data: any) => {
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
        },
        
        on: (event: string, callback: (data: any) => void) => {
          const handleMessage = (e: any) => {
            if (e.detail.event === event && e.detail.roomId === roomId) {
              const message = e.detail.data;
              if (message.from !== userId) {
                callback(message);
              }
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
        if (data.userId !== userId) {
          setParticipants(prev => {
            if (!prev.includes(data.userId)) {
              return [...prev, data.userId];
            }
            return prev;
          });
        }
      });

      const cleanupLeave = simulatedSocket.on('leave', (data) => {
        setParticipants(prev => prev.filter(id => id !== data.userId));
      });

      const cleanupChat = simulatedSocket.on('chat', (data) => {
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: data.message,
          sender: data.userName,
          timestamp: data.timestamp,
          isOwn: false
        }]);
      });

      return () => {
        // Annoncer le départ
        simulatedSocket.emit('leave', {
          roomId,
          userName,
          userId
        });
        
        cleanupJoin();
        cleanupLeave();
        cleanupChat();
        simulatedSocket.leave(roomId);
      };
    }
  }, [roomId, userName, userId]);

  const sendSignal = (signal: any, targetUserId?: string) => {
    if (socketRef.current) {
      socketRef.current.emit('signal', {
        signal,
        to: targetUserId,
        roomId
      });
    }
  };

  const sendChatMessage = (message: string) => {
    if (socketRef.current) {
      socketRef.current.emit('chat', {
        message,
        userName,
        roomId
      });
      
      // Ajouter le message à notre liste locale
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: message,
        sender: userName,
        timestamp: Date.now(),
        isOwn: true
      }]);
    }
  };

  const onSignal = (callback: (data: any) => void) => {
    if (socketRef.current) {
      return socketRef.current.on('signal', callback);
    }
    return () => {};
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