import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface Participant {
  id: string;
  name: string;
  stream?: MediaStream;
  isConnected: boolean;
  joinedAt: Date;
}

interface UseWebSocketVideoConferenceProps {
  roomId: string;
  userName: string;
  onError?: (error: string) => void;
}

interface UseWebSocketVideoConferenceReturn {
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

export function useWebSocketVideoConference({
  roomId,
  userName,
  onError
}: UseWebSocketVideoConferenceProps): UseWebSocketVideoConferenceReturn {
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

  const wsRef = useRef<WebSocket | null>(null);
  const peersRef = useRef<{ [key: string]: RTCPeerConnection }>({});
  const currentUserId = useRef(`user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const isConnectingRef = useRef(false);

  // Configuration WebSocket
  const WS_URL = 'ws://localhost:3001'; // Serveur WebSocket local

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
      // Vérifier si la connexion existe déjà et la fermer si nécessaire
      if (peersRef.current[participantId]) {
        const existingPeer = peersRef.current[participantId];
        if (existingPeer && existingPeer.connectionState !== 'closed') {
          console.log(`🔄 Fermeture connexion existante pour ${participantId}`);
          existingPeer.close();
        }
        delete peersRef.current[participantId];
      }

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
          // Utiliser une fonction temporaire pour éviter la dépendance circulaire
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            const message = {
              type: 'ice-candidate',
              to: participantId,
              candidate: event.candidate,
              fromName: userName,
              from: currentUserId.current,
              roomId,
              timestamp: new Date().toISOString()
            };
            console.log('📤 Envoi WebSocket:', message);
            wsRef.current.send(JSON.stringify(message));
          }
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

      // Gérer les changements d'état de signalisation
      peer.onsignalingstatechange = () => {
        console.log(`📡 État signalisation ${participantId}:`, peer.signalingState);
      };

      peersRef.current[participantId] = peer;
      return peer;
    } catch (err) {
      console.error(`❌ Erreur création peer pour ${participantId}:`, err);
      return null;
    }
  }, [localStream, userName]);

  // Envoyer un message WebSocket
  const sendWebSocketMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const fullMessage = {
        ...message,
        from: currentUserId.current,
        roomId,
        timestamp: new Date().toISOString()
      };
      console.log('📤 Envoi WebSocket:', fullMessage);
      wsRef.current.send(JSON.stringify(fullMessage));
    } else {
      console.error('❌ WebSocket non connecté');
    }
  }, [roomId]);

  // Traiter les messages WebSocket reçus
  const handleWebSocketMessage = useCallback((data: string) => {
    try {
      const message = JSON.parse(data);
      console.log('📨 Message WebSocket reçu:', message);

      // Ignorer nos propres messages
      if (message.from === currentUserId.current) {
        return;
      }

      switch (message.type) {
        case 'room-info':
          console.log('📋 Informations de la room:', message.participants);
          // Ajouter les participants existants
          setParticipants(message.participants.map((p: any) => ({
            id: p.id,
            name: p.name,
            isConnected: false,
            joinedAt: new Date()
          })));

          // Créer des connexions avec les participants existants
          message.participants.forEach((participant: any) => {
            if (participant.id !== currentUserId.current) {
              console.log(`🔗 Création connexion avec participant existant: ${participant.name}`);
              const peer = createPeerConnection(participant.id, false);
              if (peer) {
                // Créer une offre pour initier la connexion
                setTimeout(() => {
                  if (peer.connectionState !== 'closed') {
                    peer.createOffer()
                      .then(offer => peer.setLocalDescription(offer))
                      .then(() => {
                        sendWebSocketMessage({
                          type: 'offer',
                          to: participant.id,
                          sdp: peer.localDescription,
                          fromName: userName
                        });
                      })
                      .catch(err => console.error('❌ Erreur création offre:', err));
                  }
                }, 1000);
              }
            }
          });
          break;

        case 'user-joined':
          console.log(`👋 ${message.fromName} a rejoint la room`);
          setParticipants(prev => {
            if (!prev.find(p => p.id === message.from)) {
              const newParticipant = {
                id: message.from,
                name: message.fromName,
                isConnected: false,
                joinedAt: new Date()
              };

              // Créer une connexion peer avec le nouveau participant
              setTimeout(() => {
                console.log(`🔗 Création connexion peer avec ${message.fromName}`);
                const peer = createPeerConnection(message.from, true);
                if (peer) {
                  // Créer une offre
                  peer.createOffer()
                    .then(offer => peer.setLocalDescription(offer))
                    .then(() => {
                      sendWebSocketMessage({
                        type: 'offer',
                        to: message.from,
                        sdp: peer.localDescription,
                        fromName: userName
                      });
                    })
                    .catch(err => console.error('❌ Erreur création offre:', err));
                }
              }, 1000);

              return [...prev, newParticipant];
            }
            return prev;
          });
          break;

        case 'user-left':
          console.log(`👋 ${message.fromName} a quitté la room`);
          setParticipants(prev => prev.filter(p => p.id !== message.from));
          // Fermer la connexion peer
          const peerToClose = peersRef.current[message.from];
          if (peerToClose) {
            peerToClose.close();
            delete peersRef.current[message.from];
          }
          break;

        case 'offer':
          console.log(`📥 Offre reçue de ${message.fromName}`);
          const offerPeer = createPeerConnection(message.from, false);
          if (offerPeer) {
            // Vérifier l'état avant de définir la description distante
            if (offerPeer.signalingState === 'stable' || offerPeer.signalingState === 'have-local-offer') {
              offerPeer.setRemoteDescription(new RTCSessionDescription(message.sdp))
                .then(() => {
                  console.log('✅ Description distante définie pour offre');
                  return offerPeer.createAnswer();
                })
                .then(answer => offerPeer.setLocalDescription(answer))
                .then(() => {
                  console.log('✅ Réponse créée et définie');
                  sendWebSocketMessage({
                    type: 'answer',
                    to: message.from,
                    sdp: offerPeer.localDescription,
                    fromName: userName
                  });
                })
                .catch(err => {
                  console.error('❌ Erreur traitement offre:', err);
                  // Si l'erreur est due à l'état, essayer de redémarrer la connexion
                  if (err.message.includes('wrong state')) {
                    console.log('🔄 Redémarrage connexion peer...');
                    offerPeer.close();
                    delete peersRef.current[message.from];
                    setTimeout(() => {
                      const newPeer = createPeerConnection(message.from, false);
                      if (newPeer) {
                        newPeer.setRemoteDescription(new RTCSessionDescription(message.sdp))
                          .then(() => newPeer.createAnswer())
                          .then(answer => newPeer.setLocalDescription(answer))
                          .then(() => {
                            sendWebSocketMessage({
                              type: 'answer',
                              to: message.from,
                              sdp: newPeer.localDescription,
                              fromName: userName
                            });
                          })
                          .catch(err2 => console.error('❌ Erreur redémarrage connexion:', err2));
                      }
                    }, 1000);
                  }
                });
            } else {
              console.log(`⚠️ État de signalisation incorrect: ${offerPeer.signalingState}`);
            }
          }
          break;

        case 'answer':
          console.log(`📥 Réponse reçue de ${message.fromName}`);
          const answerPeer = peersRef.current[message.from];
          if (answerPeer) {
            // Vérifier l'état avant de définir la description distante
            if (answerPeer.signalingState === 'have-local-offer') {
              answerPeer.setRemoteDescription(new RTCSessionDescription(message.sdp))
                .then(() => {
                  console.log('✅ Description distante définie pour réponse');
                })
                .catch(err => {
                  console.error('❌ Erreur traitement réponse:', err);
                  if (err.message.includes('wrong state')) {
                    console.log(`⚠️ État de signalisation: ${answerPeer.signalingState}`);
                  }
                });
            } else {
              console.log(`⚠️ État de signalisation incorrect pour réponse: ${answerPeer.signalingState}`);
            }
          } else {
            console.error('❌ Connexion peer non trouvée pour réponse');
          }
          break;

        case 'ice-candidate':
          console.log(`📥 ICE candidate reçu de ${message.fromName}`);
          const icePeer = peersRef.current[message.from];
          if (icePeer && message.candidate) {
            icePeer.addIceCandidate(new RTCIceCandidate(message.candidate))
              .then(() => console.log('✅ ICE candidate ajouté'))
              .catch(err => console.error('❌ Erreur ajout ICE candidate:', err));
          }
          break;

        case 'chat':
          setMessages(prev => [...prev, {
            id: `${message.from}-${message.timestamp}`,
            from: message.fromName || message.from,
            message: message.text,
            timestamp: new Date(message.timestamp)
          }]);
          break;

        default:
          console.log('❓ Type de message inconnu:', message.type);
      }
    } catch (error) {
      console.error('❌ Erreur parsing message WebSocket:', error);
    }
  }, [userName, sendWebSocketMessage]);

  // Se connecter à la room
  const connectToRoom = useCallback(async () => {
    if (!user) {
      console.error('❌ Utilisateur non connecté');
      return;
    }

    if (isConnectingRef.current) {
      console.log('⏳ Connexion déjà en cours...');
      return;
    }

    try {
      isConnectingRef.current = true;
      console.log(`🚀 Connexion à la room: ${roomId}`);
      setConnectionStatus('connecting');

      // Initialiser le stream local
      const stream = await initializeLocalStream();
      if (!stream) return;

      // Créer la connexion WebSocket
      const wsUrl = `${WS_URL}?roomId=${roomId}&userId=${currentUserId.current}&userName=${encodeURIComponent(userName)}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ WebSocket connecté');
        setIsConnected(true);
        setConnectionStatus('connected');
      };

      ws.onmessage = (event) => {
        handleWebSocketMessage(event.data);
      };

      ws.onerror = (error) => {
        console.error('❌ Erreur WebSocket:', error);
        setError('Erreur de connexion WebSocket');
        setConnectionStatus('error');
      };

      ws.onclose = () => {
        console.log('🛑 WebSocket fermé');
        setIsConnected(false);
        setConnectionStatus('disconnected');
      };

    } catch (error) {
      console.error('❌ Erreur connexion room:', error);
      setError('Erreur de connexion à la room');
      setConnectionStatus('error');
    } finally {
      isConnectingRef.current = false;
    }
  }, [user, roomId, userName, initializeLocalStream, handleWebSocketMessage]);

  // Se déconnecter
  const disconnect = useCallback(() => {
    console.log('🛑 Déconnexion de la room');
    
    // Fermer les connexions peer
    Object.values(peersRef.current).forEach(peer => peer.close());
    peersRef.current = {};

    // Fermer WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Arrêter le stream local
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }

    // Réinitialiser l'état
    setIsConnected(false);
    setParticipants([]);
    setConnectionStatus('disconnected');
  }, [localStream]);

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
    sendWebSocketMessage({
      type: 'chat',
      text: message
    });
  }, [sendWebSocketMessage]);

  // Connexion automatique
  useEffect(() => {
    let mounted = true;
    
    const initialize = async () => {
      if (!mounted) return;
      await connectToRoom();
    };
    
    initialize();
    
    return () => {
      mounted = false;
      disconnect();
    };
  }, []); // Dépendances vides pour éviter les cycles

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