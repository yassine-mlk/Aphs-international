import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabase } from '@/hooks/useSupabase';
import { useToast } from '@/components/ui/use-toast';

interface Participant {
  id: string;
  name: string;
  stream?: MediaStream;
  isConnected: boolean;
  joinedAt: Date;
}

interface UseRobustVideoConferenceProps {
  roomId: string;
  userName: string;
  onError?: (error: string) => void;
}

interface UseRobustVideoConferenceReturn {
  localStream: MediaStream | null;
  participants: Participant[];
  isConnected: boolean;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  connectionStatus: 'connecting' | 'connected' | 'error' | 'disconnected';
  error: string | null;
  toggleAudio: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => void;
  disconnect: () => void;
  sendMessage: (message: string) => void;
  messages: Array<{ id: string; from: string; message: string; timestamp: Date }>;
}

export function useRobustVideoConference({
  roomId,
  userName,
  onError
}: UseRobustVideoConferenceProps): UseRobustVideoConferenceReturn {
  const { user } = useAuth();
  const { supabase } = useSupabase();
  const { toast } = useToast();
  
  // Refs
  const localStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<any>(null);
  const peersRef = useRef<{ [key: string]: RTCPeerConnection }>({});
  const mountedRef = useRef(true);
  
  // States
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error' | 'disconnected'>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ id: string; from: string; message: string; timestamp: Date }>>([]);

  const currentUserId = user?.id || `user_${Math.random().toString(36).substr(2, 9)}`;

  // Initialiser le stream local
  const initializeLocalStream = useCallback(async () => {
    try {
      console.log('🎥 Initializing local stream...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        }
      });

      localStreamRef.current = stream;
      setLocalStream(stream);
      console.log('✅ Local stream initialized');
      
      return stream;
    } catch (err) {
      console.error('❌ Failed to get user media:', err);
      setError('Impossible d\'accéder à la caméra/microphone');
      setConnectionStatus('error');
      onError?.('Impossible d\'accéder à la caméra/microphone');
      return null;
    }
  }, [onError]);

  // Créer une connexion peer-to-peer
  const createPeerConnection = useCallback((participantId: string, initiator: boolean = false) => {
    if (!localStreamRef.current) {
      console.warn('❌ Cannot create peer: no local stream');
      return null;
    }

    if (peersRef.current[participantId]) {
      console.log(`ℹ️ Peer already exists for ${participantId}`);
      return peersRef.current[participantId];
    }

    console.log(`🔗 Creating peer connection with ${participantId}, initiator: ${initiator}`);

    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
      ]
    });

    peersRef.current[participantId] = peer;

    // Ajouter le stream local
    localStreamRef.current.getTracks().forEach(track => {
      peer.addTrack(track, localStreamRef.current!);
    });

    // Gérer les candidats ICE
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`📡 ICE candidate for ${participantId}:`, event.candidate.candidate);
        sendRTCSignal(participantId, {
          type: 'ice-candidate',
          candidate: event.candidate
        });
      }
    };

    // Gérer le stream distant
    peer.ontrack = (event) => {
      console.log(`🎥 Received remote stream from ${participantId}`);
      
      setParticipants(prev => prev.map(p => 
        p.id === participantId 
          ? { ...p, stream: event.streams[0], isConnected: true }
          : p
      ));
    };

    // Gérer les changements de connexion
    peer.onconnectionstatechange = () => {
      console.log(`🔗 Connection state for ${participantId}:`, peer.connectionState);
      
      if (peer.connectionState === 'connected') {
        setParticipants(prev => prev.map(p => 
          p.id === participantId 
            ? { ...p, isConnected: true }
            : p
        ));
      } else if (peer.connectionState === 'failed' || peer.connectionState === 'disconnected') {
        setParticipants(prev => prev.map(p => 
          p.id === participantId 
            ? { ...p, isConnected: false }
            : p
        ));
      }
    };

    // Gérer les erreurs
    peer.oniceconnectionstatechange = () => {
      console.log(`🧊 ICE connection state for ${participantId}:`, peer.iceConnectionState);
    };

    return peer;
  }, []);

  // Envoyer un signal WebRTC
  const sendRTCSignal = useCallback((to: string, signal: any) => {
    if (channelRef.current) {
      console.log(`📡 Broadcasting RTC signal to ${to}:`, signal.type);
      channelRef.current.send({
        type: 'webrtc-signal',
        payload: {
          signal,
          from: currentUserId,
          to,
          timestamp: new Date().toISOString()
        }
      });
    }
  }, [currentUserId]);

  // Gérer les signaux WebRTC reçus
  const handleRTCSignal = useCallback((payload: any) => {
    const { signal, from, to } = payload;
    
    // Vérifier si le signal nous est destiné
    if (to && to !== currentUserId) {
      console.log(`📨 Signal not for us (${currentUserId}), ignoring`);
      return;
    }
    
    if (from === currentUserId) {
      console.log(`📨 Ignoring our own signal`);
      return; // Ignorer nos propres signaux
    }
    
    console.log(`📨 Processing RTC signal from ${from}:`, signal.type);
    
    let peer = peersRef.current[from];
    if (!peer) {
      console.log(`🤝 Creating peer connection for signal from ${from}`);
      peer = createPeerConnection(from, false);
    }

    if (peer) {
      try {
        if (signal.type === 'offer') {
          console.log(`📥 Processing offer from ${from}`);
          peer.setRemoteDescription(new RTCSessionDescription(signal))
            .then(() => {
              console.log(`✅ Remote description set for ${from}`);
              return peer.createAnswer();
            })
            .then(answer => {
              console.log(`📤 Created answer for ${from}`);
              return peer.setLocalDescription(answer);
            })
            .then(() => {
              console.log(`📤 Sending answer to ${from}`);
              sendRTCSignal(from, {
                type: 'answer',
                sdp: peer.localDescription
              });
            })
            .catch(err => {
              console.error(`❌ Error handling offer from ${from}:`, err);
            });
        } else if (signal.type === 'answer') {
          console.log(`📥 Processing answer from ${from}`);
          peer.setRemoteDescription(new RTCSessionDescription(signal))
            .then(() => {
              console.log(`✅ Answer processed for ${from}`);
            })
            .catch(err => {
              console.error(`❌ Error handling answer from ${from}:`, err);
            });
        } else if (signal.type === 'ice-candidate') {
          console.log(`🧊 Processing ICE candidate from ${from}`);
          peer.addIceCandidate(new RTCIceCandidate(signal.candidate))
            .then(() => {
              console.log(`✅ ICE candidate added for ${from}`);
            })
            .catch(err => {
              console.error(`❌ Error adding ICE candidate from ${from}:`, err);
            });
        }
      } catch (err) {
        console.error(`❌ Error processing RTC signal from ${from}:`, err);
      }
    } else {
      console.error(`❌ Could not create peer connection for ${from}`);
    }
  }, [currentUserId, createPeerConnection, sendRTCSignal]);

  // Se connecter à la room
  const connectToRoom = useCallback(async () => {
    if (!supabase || channelRef.current) {
      return;
    }

    try {
      console.log(`🚪 Connecting to room: ${roomId}`);
      setConnectionStatus('connecting');

      // Initialiser le stream local
      const stream = await initializeLocalStream();
      if (!stream) return;

      // Créer le canal Supabase Realtime
      const channel = supabase.channel(`video_room_${roomId}`, {
        config: {
          broadcast: { self: false, ack: false },
          presence: { key: currentUserId }
        }
      });

      channelRef.current = channel;

      // Écouter les signaux WebRTC
      channel.on('broadcast', { event: 'webrtc-signal' }, ({ payload }) => {
        handleRTCSignal(payload);
      });

      // Écouter les messages de chat
      channel.on('broadcast', { event: 'chat-message' }, ({ payload }) => {
        const { from, message, timestamp } = payload;
        if (from !== currentUserId) {
          setMessages(prev => [...prev, {
            id: `${from}-${timestamp}`,
            from,
            message,
            timestamp: new Date(timestamp)
          }]);
        }
      });

      // Gérer les présences
      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const participantIds = Object.keys(state).filter(id => id !== currentUserId);
          
          console.log(`👥 Room participants (${participantIds.length}):`, participantIds);
          
          // Créer des connexions peer avec les participants existants
          participantIds.forEach(participantId => {
            if (!peersRef.current[participantId]) {
              console.log(`🤝 Initiating connection with existing participant: ${participantId}`);
              const peer = createPeerConnection(participantId, true);
              
              if (peer) {
                // Créer une offre
                peer.createOffer()
                  .then(offer => peer.setLocalDescription(offer))
                  .then(() => {
                    sendRTCSignal(participantId, {
                      type: 'offer',
                      sdp: peer.localDescription
                    });
                  })
                  .catch(err => console.error('Error creating offer:', err));
              }
              
              // Ajouter à la liste des participants
              setParticipants(prev => {
                if (!prev.find(p => p.id === participantId)) {
                  return [...prev, {
                    id: participantId,
                    name: participantId.slice(0, 8) + '...',
                    isConnected: false,
                    joinedAt: new Date()
                  }];
                }
                return prev;
              });
            }
          });
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          if (key !== currentUserId) {
            console.log(`👋 User joined: ${key}`);
            
            // Ajouter le nouveau participant à la liste
            setParticipants(prev => {
              if (!prev.find(p => p.id === key)) {
                return [...prev, {
                  id: key,
                  name: key.slice(0, 8) + '...',
                  isConnected: false,
                  joinedAt: new Date()
                }];
              }
              return prev;
            });

            // Créer une connexion peer avec le nouveau participant
            if (!peersRef.current[key]) {
              console.log(`🤝 Creating peer connection with new participant: ${key}`);
              const peer = createPeerConnection(key, true);
              
              if (peer) {
                // Créer une offre pour le nouveau participant
                peer.createOffer()
                  .then(offer => peer.setLocalDescription(offer))
                  .then(() => {
                    console.log(`📤 Sending offer to new participant: ${key}`);
                    sendRTCSignal(key, {
                      type: 'offer',
                      sdp: peer.localDescription
                    });
                  })
                  .catch(err => console.error('Error creating offer for new participant:', err));
              }
            }
          }
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          console.log(`👋 User left: ${key}`);
          
          // Fermer la connexion peer
          if (peersRef.current[key]) {
            peersRef.current[key].close();
            delete peersRef.current[key];
          }
          
          setParticipants(prev => prev.filter(p => p.id !== key));
        });

      // Se connecter au canal
      await channel.subscribe();
      
      // Se présenter dans la room
      await channel.track({
        id: currentUserId,
        name: userName,
        joinedAt: new Date().toISOString()
      });

      setIsConnected(true);
      setConnectionStatus('connected');
      console.log('✅ Connected to video room');

    } catch (err) {
      console.error('❌ Failed to connect to room:', err);
      setError('Impossible de se connecter à la room');
      setConnectionStatus('error');
      onError?.('Impossible de se connecter à la room');
    }
  }, [supabase, roomId, currentUserId, userName, initializeLocalStream, createPeerConnection, sendRTCSignal, handleRTCSignal, onError]);

  // Se déconnecter
  const disconnect = useCallback(() => {
    console.log('🔌 Disconnecting from room...');
    
    // Fermer toutes les connexions peer
    Object.values(peersRef.current).forEach(peer => {
      peer.close();
    });
    peersRef.current = {};

    // Fermer le canal
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }

    // Arrêter le stream local
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    setLocalStream(null);
    setParticipants([]);
    setIsConnected(false);
    setConnectionStatus('disconnected');
    setError(null);
  }, []);

  // Contrôles audio/vidéo
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  }, []);

  const toggleScreenShare = useCallback(async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });

        // Remplacer la vidéo par l'écran
        const videoTrack = screenStream.getVideoTracks()[0];
        const sender = Object.values(peersRef.current)[0]?.getSenders().find(s => s.track?.kind === 'video');
        
        if (sender) {
          sender.replaceTrack(videoTrack);
        }

        setIsScreenSharing(true);
        
        // Arrêter le partage quand l'utilisateur clique "Stop sharing"
        videoTrack.onended = () => {
          setIsScreenSharing(false);
          // Remettre la caméra
          if (localStreamRef.current) {
            const cameraTrack = localStreamRef.current.getVideoTracks()[0];
            if (sender && cameraTrack) {
              sender.replaceTrack(cameraTrack);
            }
          }
        };
      }
    } catch (err) {
      console.error('Error sharing screen:', err);
      toast({
        title: "Erreur",
        description: "Impossible de partager l'écran",
        variant: "destructive"
      });
    }
  }, [isScreenSharing, toast]);

  // Envoyer un message
  const sendMessage = useCallback((message: string) => {
    if (channelRef.current && message.trim()) {
      const timestamp = new Date().toISOString();
      
      channelRef.current.send({
        type: 'chat-message',
        payload: {
          from: currentUserId,
          message: message.trim(),
          timestamp
        }
      });

      // Ajouter le message localement
      setMessages(prev => [...prev, {
        id: `${currentUserId}-${timestamp}`,
        from: currentUserId,
        message: message.trim(),
        timestamp: new Date(timestamp)
      }]);
    }
  }, [currentUserId]);

  // Initialiser la connexion
  useEffect(() => {
    if (mountedRef.current) {
      connectToRoom();
    }

    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [connectToRoom, disconnect]);

  return {
    localStream,
    participants,
    isConnected,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    connectionStatus,
    error,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    disconnect,
    sendMessage,
    messages
  };
} 