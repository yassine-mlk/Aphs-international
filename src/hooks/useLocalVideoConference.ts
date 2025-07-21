import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface Participant {
  id: string;
  name: string;
  stream?: MediaStream;
  isConnected: boolean;
  joinedAt: Date;
}

interface UseLocalVideoConferenceProps {
  roomId: string;
  userName: string;
  onError?: (error: string) => void;
}

interface UseLocalVideoConferenceReturn {
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

export function useLocalVideoConference({
  roomId,
  userName,
  onError
}: UseLocalVideoConferenceProps): UseLocalVideoConferenceReturn {
  const { user } = useAuth();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error' | 'disconnected'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ id: string; from: string; message: string; timestamp: Date }>>([]);

  const peersRef = useRef<{ [key: string]: RTCPeerConnection }>({});
  const currentUserId = useRef(`user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const storageIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
      console.error('❌ Erreur accès caméra/micro:', err);
      setError('Impossible d\'accéder à la caméra/microphone');
      onError?.('Impossible d\'accéder à la caméra/microphone');
      return null;
    }
  }, [onError]);

  // Créer une connexion peer
  const createPeerConnection = useCallback((participantId: string, isInitiator: boolean): RTCPeerConnection | null => {
    try {
      const peer = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
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
          console.log(`📡 ICE candidate for ${participantId}:`, event.candidate.candidate);
          // Stocker le candidat ICE dans localStorage
          const iceData = {
            type: 'ice-candidate',
            from: currentUserId.current,
            to: participantId,
            candidate: event.candidate,
            timestamp: new Date().toISOString()
          };
          localStorage.setItem(`ice_${roomId}_${Date.now()}`, JSON.stringify(iceData));
        }
      };

      // Gérer les streams entrants
      peer.ontrack = (event) => {
        console.log(`📹 Stream reçu de ${participantId}:`, event.streams[0]);
        setParticipants(prev => prev.map(p => 
          p.id === participantId 
            ? { ...p, stream: event.streams[0], isConnected: true }
            : p
        ));
      };

      // Gérer les changements d'état de connexion
      peer.onconnectionstatechange = () => {
        console.log(`🔗 État connexion ${participantId}:`, peer.connectionState);
        if (peer.connectionState === 'connected') {
          setParticipants(prev => prev.map(p => 
            p.id === participantId 
              ? { ...p, isConnected: true }
              : p
          ));
        }
      };

      peersRef.current[participantId] = peer;
      return peer;
    } catch (err) {
      console.error(`❌ Erreur création peer pour ${participantId}:`, err);
      return null;
    }
  }, [localStream, roomId]);

  // Envoyer un message via localStorage
  const sendLocalStorageMessage = useCallback((message: any) => {
    const fullMessage = {
      ...message,
      from: currentUserId.current,
      roomId,
      timestamp: new Date().toISOString()
    };
    console.log('📤 Envoi localStorage:', fullMessage);
    
    // Stocker le message avec un timestamp unique
    const key = `msg_${roomId}_${Date.now()}_${Math.random()}`;
    localStorage.setItem(key, JSON.stringify(fullMessage));
    
    // Nettoyer les anciens messages après 5 secondes
    setTimeout(() => {
      localStorage.removeItem(key);
    }, 5000);
  }, [roomId]);

  // Traiter les messages localStorage reçus
  const handleLocalStorageMessage = useCallback((data: any) => {
    try {
      const message = JSON.parse(data);
      console.log('📨 Message localStorage reçu:', message);

      // Ignorer nos propres messages
      if (message.from === currentUserId.current) {
        return;
      }

      switch (message.type) {
        case 'join':
          console.log(`👋 ${message.userName} a rejoint la room`);
          setParticipants(prev => {
            if (!prev.find(p => p.id === message.from)) {
              return [...prev, {
                id: message.from,
                name: message.userName,
                isConnected: false,
                joinedAt: new Date()
              }];
            }
            return prev;
          });
          break;

        case 'leave':
          console.log(`👋 ${message.userName} a quitté la room`);
          setParticipants(prev => prev.filter(p => p.id !== message.from));
          if (peersRef.current[message.from]) {
            peersRef.current[message.from].close();
            delete peersRef.current[message.from];
          }
          break;

        case 'offer':
          console.log(`📥 Offre reçue de ${message.from}`);
          let peer = peersRef.current[message.from];
          if (!peer) {
            peer = createPeerConnection(message.from, false);
          }
          if (peer) {
            peer.setRemoteDescription(new RTCSessionDescription(message.sdp))
              .then(() => peer.createAnswer())
              .then(answer => peer.setLocalDescription(answer))
              .then(() => {
                sendLocalStorageMessage({
                  type: 'answer',
                  to: message.from,
                  sdp: peer.localDescription
                });
              })
              .catch(err => console.error('❌ Erreur traitement offre:', err));
          }
          break;

        case 'answer':
          console.log(`📥 Réponse reçue de ${message.from}`);
          const answerPeer = peersRef.current[message.from];
          if (answerPeer) {
            answerPeer.setRemoteDescription(new RTCSessionDescription(message.sdp))
              .catch(err => console.error('❌ Erreur traitement réponse:', err));
          }
          break;

        case 'ice-candidate':
          console.log(`📥 Candidat ICE reçu de ${message.from}`);
          const icePeer = peersRef.current[message.from];
          if (icePeer && message.candidate) {
            icePeer.addIceCandidate(new RTCIceCandidate(message.candidate))
              .catch(err => console.error('❌ Erreur ajout candidat ICE:', err));
          }
          break;

        case 'chat':
          setMessages(prev => [...prev, {
            id: `${message.from}-${message.timestamp}`,
            from: message.from,
            message: message.text,
            timestamp: new Date(message.timestamp)
          }]);
          break;

        default:
          console.warn('⚠️ Type de message inconnu:', message.type);
      }
    } catch (err) {
      console.error('❌ Erreur parsing message localStorage:', err);
    }
  }, [createPeerConnection, sendLocalStorageMessage]);

  // Surveiller les changements localStorage
  const startLocalStorageListener = useCallback(() => {
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key, value) {
      originalSetItem.apply(this, [key, value]);
      
      // Vérifier si c'est un message pour notre room
      if (key.includes(`msg_${roomId}_`) || key.includes(`ice_${roomId}_`)) {
        try {
          const message = JSON.parse(value);
          if (message.roomId === roomId) {
            handleLocalStorageMessage(value);
          }
        } catch (err) {
          // Ignorer les erreurs de parsing
        }
      }
    };
  }, [roomId, handleLocalStorageMessage]);

  // Se connecter à la room
  const connectToRoom = useCallback(async () => {
    if (!user) {
      console.error('❌ Utilisateur non connecté');
      return;
    }

    try {
      console.log(`🚀 Connexion à la room: ${roomId}`);
      setConnectionStatus('connecting');

      // Initialiser le stream local
      const stream = await initializeLocalStream();
      if (!stream) return;

      // Démarrer l'écoute localStorage
      startLocalStorageListener();

      // Envoyer le message de join
      sendLocalStorageMessage({
        type: 'join',
        userName
      });

      setIsConnected(true);
      setConnectionStatus('connected');

      // Créer des participants simulés pour les tests
      setTimeout(() => {
        const simulatedParticipants = [
          {
            id: `sim_${Date.now()}_1`,
            name: 'Participant Test 1',
            isConnected: false,
            joinedAt: new Date()
          },
          {
            id: `sim_${Date.now()}_2`,
            name: 'Participant Test 2',
            isConnected: false,
            joinedAt: new Date()
          }
        ];
        setParticipants(simulatedParticipants);
      }, 2000);

    } catch (error) {
      console.error('❌ Erreur connexion room:', error);
      setError('Erreur de connexion à la room');
      setConnectionStatus('error');
    }
  }, [user, roomId, userName, initializeLocalStream, startLocalStorageListener, sendLocalStorageMessage]);

  // Se déconnecter
  const disconnect = useCallback(() => {
    console.log('🛑 Déconnexion de la room');
    
    // Fermer les connexions peer
    Object.values(peersRef.current).forEach(peer => peer.close());
    peersRef.current = {};

    // Envoyer message de leave
    sendLocalStorageMessage({ type: 'leave', userName });

    // Arrêter le stream local
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }

    // Réinitialiser l'état
    setIsConnected(false);
    setParticipants([]);
    setConnectionStatus('disconnected');
  }, [localStream, sendLocalStorageMessage, userName]);

  // Contrôles audio/vidéo
  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  }, [localStream]);

  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  }, [localStream]);

  const toggleScreenShare = useCallback(async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        // Remplacer la piste vidéo
        const videoTrack = screenStream.getVideoTracks()[0];
        const sender = Object.values(peersRef.current)[0]?.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
        
        screenStreamRef.current = screenStream;
        setIsScreenSharing(true);
      } else {
        // Restaurer la caméra
        if (localStream) {
          const videoTrack = localStream.getVideoTracks()[0];
          const sender = Object.values(peersRef.current)[0]?.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
        }
        
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach(track => track.stop());
          screenStreamRef.current = null;
        }
        setIsScreenSharing(false);
      }
    } catch (err) {
      console.error('❌ Erreur partage d\'écran:', err);
    }
  }, [isScreenSharing, localStream]);

  // Envoyer un message de chat
  const sendMessage = useCallback((message: string) => {
    sendLocalStorageMessage({
      type: 'chat',
      text: message
    });
  }, [sendLocalStorageMessage]);

  // Connexion automatique
  useEffect(() => {
    connectToRoom();
    return () => disconnect();
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