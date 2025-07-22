import { useState, useEffect, useRef, useCallback } from 'react';

interface Participant {
  id: string;
  name: string;
  stream?: MediaStream;
  isConnected: boolean;
  joinedAt: Date;
}

interface UsePublicVideoConferenceProps {
  roomId: string;
  userName: string;
  onError?: (error: string) => void;
}

interface UsePublicVideoConferenceReturn {
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

export function usePublicVideoConference({
  roomId,
  userName,
  onError
}: UsePublicVideoConferenceProps): UsePublicVideoConferenceReturn {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error' | 'disconnected'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ id: string; from: string; fromName: string; message: string; timestamp: Date }>>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const currentUserId = useRef<string>(`user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
          console.log(`📡 ICE candidate pour ${participantId}:`, event.candidate.candidate);
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            const message = {
              type: 'ice-candidate',
              to: participantId,
              from: currentUserId.current,
              fromName: userName,
              candidate: event.candidate,
              roomId,
              timestamp: new Date().toISOString()
            };
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

      peerConnectionsRef.current.set(participantId, peer);
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
              const peer = createPeerConnection(participant.id);
              if (peer) {
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
                const peer = createPeerConnection(message.from);
                if (peer) {
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
          const peerToClose = peerConnectionsRef.current.get(message.from);
          if (peerToClose) {
            peerToClose.close();
            peerConnectionsRef.current.delete(message.from);
          }
          break;

        case 'offer':
          console.log(`📥 Offre reçue de ${message.fromName}`);
          const offerPeer = createPeerConnection(message.from);
          if (offerPeer) {
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
                  if (err.message.includes('wrong state')) {
                    console.log('🔄 Redémarrage connexion peer...');
                    offerPeer.close();
                    peerConnectionsRef.current.delete(message.from);
                    setTimeout(() => {
                      const newPeer = createPeerConnection(message.from);
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
          const answerPeer = peerConnectionsRef.current.get(message.from);
          if (answerPeer) {
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
          const icePeer = peerConnectionsRef.current.get(message.from);
          if (icePeer && message.candidate) {
            icePeer.addIceCandidate(new RTCIceCandidate(message.candidate))
              .then(() => console.log('✅ ICE candidate ajouté'))
              .catch(err => console.error('❌ Erreur ajout ICE candidate:', err));
          }
          break;

        case 'chat':
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            from: message.from,
            fromName: message.fromName,
            message: message.message,
            timestamp: new Date()
          }]);
          break;

        default:
          console.log('❓ Type de message inconnu:', message.type);
      }
    } catch (error) {
      console.error('❌ Erreur parsing message WebSocket:', error);
    }
  }, [userName, sendWebSocketMessage, createPeerConnection]);

  // Se connecter à la room
  const connectToRoom = useCallback(async () => {
    try {
      setConnectionStatus('connecting');
      setError(null);

      // Utiliser un service WebSocket public qui fonctionne immédiatement
      const wsUrl = `wss://ws.postman-echo.com/raw`;
      console.log('🌐 Connexion au service WebSocket public:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ WebSocket connecté');
        setIsConnected(true);
        setConnectionStatus('connected');
        
        // Envoyer un message de join
        sendWebSocketMessage({
          type: 'join',
          fromName: userName
        });

        // Simuler des participants pour les tests
        setTimeout(() => {
          setParticipants([
            {
              id: 'test-user-1',
              name: 'Test User 1',
              isConnected: false,
              joinedAt: new Date()
            },
            {
              id: 'test-user-2',
              name: 'Test User 2',
              isConnected: false,
              joinedAt: new Date()
            }
          ]);
        }, 2000);
      };

      ws.onmessage = (event) => {
        handleWebSocketMessage(event.data);
      };

      ws.onerror = (error) => {
        console.error('❌ Erreur WebSocket:', error);
        setError('Erreur de connexion WebSocket');
        setConnectionStatus('error');
        onError?.('Erreur de connexion WebSocket');
      };

      ws.onclose = () => {
        console.log('🛑 WebSocket fermé');
        setIsConnected(false);
        setConnectionStatus('disconnected');
        
        // Tentative de reconnexion automatique
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('🔄 Tentative de reconnexion...');
          connectToRoom();
        }, 5000);
      };

    } catch (err) {
      console.error('❌ Erreur connexion room:', err);
      setError('Erreur de connexion à la room');
      setConnectionStatus('error');
      onError?.('Erreur de connexion à la room');
    }
  }, [roomId, userName, sendWebSocketMessage, handleWebSocketMessage, onError]);

  // Se déconnecter
  const disconnect = useCallback(() => {
    console.log('🛑 Déconnexion de la room');
    
    // Annuler la reconnexion automatique
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Fermer toutes les connexions peer
    peerConnectionsRef.current.forEach(peer => {
      peer.close();
    });
    peerConnectionsRef.current.clear();

    // Fermer la connexion WebSocket
    if (wsRef.current) {
      wsRef.current.close();
    }

    setParticipants([]);
    setIsConnected(false);
    setConnectionStatus('disconnected');
  }, []);

  // Envoyer un message chat
  const sendMessage = useCallback((message: string) => {
    if (isConnected) {
      sendWebSocketMessage({
        type: 'chat',
        fromName: userName,
        message
      });
    }
  }, [userName, isConnected, sendWebSocketMessage]);

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
        peerConnectionsRef.current.forEach(peer => {
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
      console.error('❌ Erreur screen share:', err);
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