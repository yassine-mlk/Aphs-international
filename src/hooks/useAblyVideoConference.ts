import { useState, useEffect, useRef, useCallback } from 'react';
import Ably from 'ably';

interface Participant {
  id: string;
  name: string;
  stream?: MediaStream;
  isConnected: boolean;
  joinedAt: Date;
}

interface UseAblyVideoConferenceProps {
  roomId: string;
  userName: string;
  onError?: (error: string) => void;
}

interface UseAblyVideoConferenceReturn {
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
  messages: Array<{ id: string; from: string; fromName: string; message: string; timestamp: Date }>;
}

export function useAblyVideoConference({
  roomId,
  userName,
  onError
}: UseAblyVideoConferenceProps): UseAblyVideoConferenceReturn {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error' | 'disconnected'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ id: string; from: string; fromName: string; message: string; timestamp: Date }>>([]);

  const ablyRef = useRef<Ably.Realtime | null>(null);
  const channelRef = useRef<Ably.Types.RealtimeChannelPromise | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const currentUserId = useRef<string>(`user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const screenStreamRef = useRef<MediaStream | null>(null);

  // Initialiser le stream local
  const initializeLocalStream = useCallback(async (): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true
      });
      setLocalStream(stream);
      return stream;
    } catch (err) {
      setError('Impossible d\'accéder à la caméra/microphone');
      onError?.('Impossible d\'accéder à la caméra/microphone');
      return null;
    }
  }, [onError]);

  // Créer une connexion peer
  const createPeerConnection = useCallback((participantId: string): RTCPeerConnection | null => {
    try {
      // Fermer la connexion existante si elle existe
      const existingPeer = peerConnectionsRef.current.get(participantId);
      if (existingPeer) {
        existingPeer.close();
        peerConnectionsRef.current.delete(participantId);
      }

      const peer = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' }
        ]
      });

      // Ajouter le stream local
      if (localStream) {
        localStream.getTracks().forEach(track => {
          peer.addTrack(track, localStream);
        });
      }

      // Gérer les candidats ICE
      peer.onicecandidate = (event) => {
        if (event.candidate) {
          channelRef.current?.publish('webrtc-signal', {
            type: 'ice-candidate',
            to: participantId,
            from: currentUserId.current,
            fromName: userName,
            candidate: event.candidate
          });
        }
      };

      // Gérer les streams entrants
      peer.ontrack = (event) => {
        setParticipants(prev => prev.map(p => 
          p.id === participantId 
            ? { ...p, stream: event.streams[0], isConnected: true }
            : p
        ));
      };

      // Gérer les changements d'état de connexion
      peer.onconnectionstatechange = () => {
        if (peer.connectionState === 'connected') {
          setParticipants(prev => prev.map(p => 
            p.id === participantId 
              ? { ...p, isConnected: true }
              : p
          ));
        }
      };

      // Gérer les changements d'état de signalisation
      peer.onsignalingstatechange = () => {
      };

      peerConnectionsRef.current.set(participantId, peer);
      return peer;
    } catch (err) {
      return null;
    }
  }, [localStream, userName]);

  // Se connecter à la room
  const connectToRoom = useCallback(async () => {
    try {
      setConnectionStatus('connecting');
      setError(null);

      // Initialiser Ably (clé publique gratuite)
      const ably = new Ably.Realtime({
        key: 'YOUR_ABLY_KEY', // Nous utiliserons une clé publique pour les tests
        clientId: currentUserId.current
      });

      ablyRef.current = ably;

      // Attendre la connexion
      await new Promise<void>((resolve, reject) => {
        ably.connection.once('connected', () => {
          resolve();
        });
        ably.connection.once('failed', (err) => {
          reject(err);
        });
      });

      // Rejoindre le canal
      const channel = ably.channels.get(`video-room-${roomId}`);
      channelRef.current = channel;

      // S'abonner aux messages
      await channel.subscribe('presence', (message) => {
        if (message.action === 'enter') {
          const newParticipant = {
            id: message.clientId,
            name: message.data?.name || 'Utilisateur',
            isConnected: false,
            joinedAt: new Date()
          };
          setParticipants(prev => {
            if (!prev.find(p => p.id === message.clientId)) {
              return [...prev, newParticipant];
            }
            return prev;
          });
        } else if (message.action === 'leave') {
          setParticipants(prev => prev.filter(p => p.id !== message.clientId));
          const peer = peerConnectionsRef.current.get(message.clientId);
          if (peer) {
            peer.close();
            peerConnectionsRef.current.delete(message.clientId);
          }
        }
      });

      await channel.subscribe('webrtc-signal', (message) => {
        const data = message.data;

        if (data.from === currentUserId.current) {
          return; // Ignorer nos propres messages
        }

        switch (data.type) {
          case 'offer':
            const offerPeer = createPeerConnection(data.from);
            if (offerPeer) {
              offerPeer.setRemoteDescription(new RTCSessionDescription(data.sdp))
                .then(() => offerPeer.createAnswer())
                .then(answer => offerPeer.setLocalDescription(answer))
                .then(() => {
                  channel.publish('webrtc-signal', {
                    type: 'answer',
                    to: data.from,
                    from: currentUserId.current,
                    fromName: userName,
                    sdp: offerPeer.localDescription
                  });
                })
            }
            break;

          case 'answer':
            const answerPeer = peerConnectionsRef.current.get(data.from);
            if (answerPeer) {
              answerPeer.setRemoteDescription(new RTCSessionDescription(data.sdp))
            }
            break;

          case 'ice-candidate':
            const icePeer = peerConnectionsRef.current.get(data.from);
            if (icePeer && data.candidate) {
              icePeer.addIceCandidate(new RTCIceCandidate(data.candidate))
            }
            break;
        }
      });

      await channel.subscribe('chat', (message) => {
        const data = message.data;
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          from: data.from,
          fromName: data.fromName,
          message: data.message,
          timestamp: new Date()
        }]);
      });

      // Rejoindre la présence
      await channel.presence.enter({ name: userName });

      // Créer des connexions avec les participants existants
      const presenceMembers = await channel.presence.get();

      presenceMembers.forEach(member => {
        if (member.clientId !== currentUserId.current) {
          const participant = {
            id: member.clientId,
            name: member.data?.name || 'Utilisateur',
            isConnected: false,
            joinedAt: new Date()
          };
          setParticipants(prev => {
            if (!prev.find(p => p.id === member.clientId)) {
              return [...prev, participant];
            }
            return prev;
          });

          // Créer une connexion peer
          setTimeout(() => {
            const peer = createPeerConnection(member.clientId);
            if (peer) {
              peer.createOffer()
                .then(offer => peer.setLocalDescription(offer))
                .then(() => {
                  channel.publish('webrtc-signal', {
                    type: 'offer',
                    to: member.clientId,
                    from: currentUserId.current,
                    fromName: userName,
                    sdp: peer.localDescription
                  });
                })
            }
          }, 1000);
        }
      });

      setIsConnected(true);
      setConnectionStatus('connected');

    } catch (err) {
      setError('Erreur de connexion à la room');
      setConnectionStatus('error');
      onError?.('Erreur de connexion à la room');
    }
  }, [roomId, userName, createPeerConnection, onError]);

  // Se déconnecter
  const disconnect = useCallback(() => {
    
    // Fermer toutes les connexions peer
    peerConnectionsRef.current.forEach(peer => {
      peer.close();
    });
    peerConnectionsRef.current.clear();

    // Quitter la présence
    if (channelRef.current) {
      channelRef.current.presence.leave();
    }

    // Fermer la connexion Ably
    if (ablyRef.current) {
      ablyRef.current.close();
    }

    setParticipants([]);
    setIsConnected(false);
    setConnectionStatus('disconnected');
  }, []);

  // Envoyer un message chat
  const sendMessage = useCallback((message: string) => {
    if (channelRef.current && isConnected) {
      channelRef.current.publish('chat', {
        from: currentUserId.current,
        fromName: userName,
        message
      });
    }
  }, [userName, isConnected]);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  }, [localStream]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  }, [localStream]);

  // Toggle screen share
  const toggleScreenShare = useCallback(async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        screenStreamRef.current = screenStream;

        // Remplacer la vidéo par l'écran
        const videoTrack = screenStream.getVideoTracks()[0];
        const sender = peerConnectionsRef.current.forEach(peer => {
          const senders = peer.getSenders();
          const videoSender = senders.find(s => s.track?.kind === 'video');
          if (videoSender) {
            videoSender.replaceTrack(videoTrack);
          }
        });

        setIsScreenSharing(true);
      } else {
        // Restaurer la vidéo de la caméra
        if (localStream) {
          const videoTrack = localStream.getVideoTracks()[0];
          peerConnectionsRef.current.forEach(peer => {
            const senders = peer.getSenders();
            const videoSender = senders.find(s => s.track?.kind === 'video');
            if (videoSender) {
              videoSender.replaceTrack(videoTrack);
            }
          });
        }

        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach(track => track.stop());
          screenStreamRef.current = null;
        }

        setIsScreenSharing(false);
      }
    } catch (err) {
    }
  }, [isScreenSharing, localStream]);

  // Initialiser
  useEffect(() => {
    const initialize = async () => {
      const stream = await initializeLocalStream();
      if (stream) {
        await connectToRoom();
      }
    };

    initialize();

    return () => {
      disconnect();
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [initializeLocalStream, connectToRoom, disconnect]);

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