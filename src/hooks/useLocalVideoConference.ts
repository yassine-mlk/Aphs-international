import { useState, useEffect, useRef, useCallback } from 'react';

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
  messages: Array<{ id: string; from: string; fromName: string; message: string; timestamp: Date }>;
}

export function useLocalVideoConference({
  roomId,
  userName,
  onError
}: UseLocalVideoConferenceProps): UseLocalVideoConferenceReturn {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error' | 'disconnected'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ id: string; from: string; fromName: string; message: string; timestamp: Date }>>([]);

  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const currentUserId = useRef<string>(`user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const storageKey = useRef<string>(`video_conference_${roomId}`);
  const isConnectingRef = useRef<boolean>(false);

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
          // Stocker le candidat ICE dans localStorage
          const message = {
            type: 'ice-candidate',
            to: participantId,
            from: currentUserId.current,
            fromName: userName,
            candidate: event.candidate,
            roomId,
            timestamp: new Date().toISOString()
          };
          localStorage.setItem(`${storageKey.current}_${Date.now()}`, JSON.stringify(message));
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
  }, [localStream, userName, storageKey]);

  // Envoyer un message via localStorage
  const sendLocalStorageMessage = useCallback((message: any) => {
    const fullMessage = {
      ...message,
      from: currentUserId.current,
      roomId,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem(`${storageKey.current}_${Date.now()}`, JSON.stringify(fullMessage));
  }, [storageKey]);

  // Traiter les messages localStorage
  const handleLocalStorageMessage = useCallback((data: string) => {
    try {
      const message = JSON.parse(data);

      // Ignorer nos propres messages
      if (message.from === currentUserId.current) {
        return;
      }

      switch (message.type) {
        case 'join':
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
                const peer = createPeerConnection(message.from);
                if (peer) {
                  peer.createOffer()
                    .then(offer => peer.setLocalDescription(offer))
                    .then(() => {
                      sendLocalStorageMessage({
                        type: 'offer',
                        to: message.from,
                        sdp: peer.localDescription,
                        fromName: userName
                      });
                    })
                }
              }, 1000);

              return [...prev, newParticipant];
            }
            return prev;
          });
          break;

        case 'leave':
          setParticipants(prev => prev.filter(p => p.id !== message.from));
          const peerToClose = peerConnectionsRef.current.get(message.from);
          if (peerToClose) {
            peerToClose.close();
            peerConnectionsRef.current.delete(message.from);
          }
          break;

        case 'offer':
          const offerPeer = createPeerConnection(message.from);
          if (offerPeer) {
            if (offerPeer.signalingState === 'stable' || offerPeer.signalingState === 'have-local-offer') {
              offerPeer.setRemoteDescription(new RTCSessionDescription(message.sdp))
                .then(() => {
                  return offerPeer.createAnswer();
                })
                .then(answer => offerPeer.setLocalDescription(answer))
                .then(() => {
                  sendLocalStorageMessage({
                    type: 'answer',
                    to: message.from,
                    sdp: offerPeer.localDescription,
                    fromName: userName
                  });
                })
                .catch(err => {
                  if (err.message.includes('wrong state')) {
                    offerPeer.close();
                    peerConnectionsRef.current.delete(message.from);
                    setTimeout(() => {
                      const newPeer = createPeerConnection(message.from);
                      if (newPeer) {
                        newPeer.setRemoteDescription(new RTCSessionDescription(message.sdp))
                          .then(() => newPeer.createAnswer())
                          .then(answer => newPeer.setLocalDescription(answer))
                          .then(() => {
                            sendLocalStorageMessage({
                              type: 'answer',
                              to: message.from,
                              sdp: newPeer.localDescription,
                              fromName: userName
                            });
                          })
                      }
                    }, 1000);
                  }
                });
            } else {
            }
          }
          break;

        case 'answer':
          const answerPeer = peerConnectionsRef.current.get(message.from);
          if (answerPeer) {
            if (answerPeer.signalingState === 'have-local-offer') {
              answerPeer.setRemoteDescription(new RTCSessionDescription(message.sdp))
                .then(() => {
                })
                .catch(err => {
                  if (err.message.includes('wrong state')) {
                  }
                });
            } else {
            }
          } else {
          }
          break;

        case 'ice-candidate':
          const icePeer = peerConnectionsRef.current.get(message.from);
          if (icePeer && message.candidate) {
            icePeer.addIceCandidate(new RTCIceCandidate(message.candidate))
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
      }
    } catch (error) {
    }
  }, [userName, sendLocalStorageMessage, createPeerConnection]);

  // Se connecter à la room
  const connectToRoom = useCallback(async () => {
    if (isConnectingRef.current) return;
    isConnectingRef.current = true;

    try {
      setConnectionStatus('connecting');
      setError(null);


      // Envoyer un message de join
      sendLocalStorageMessage({
        type: 'join',
        fromName: userName
      });

      setIsConnected(true);
      setConnectionStatus('connected');

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

    } catch (err) {
      setError('Erreur de connexion à la room');
      setConnectionStatus('error');
      onError?.('Erreur de connexion à la room');
    } finally {
      isConnectingRef.current = false;
    }
  }, [roomId, userName, sendLocalStorageMessage, onError]);

  // Écouter les messages localStorage
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && e.key.startsWith(storageKey.current) && e.newValue) {
        handleLocalStorageMessage(e.newValue);
      }
    };

    // Écouter les changements localStorage
    window.addEventListener('storage', handleStorageChange);

    // Vérifier les messages existants
    const checkExistingMessages = () => {
      const keys = Object.keys(localStorage);
      const roomKeys = keys.filter(key => key.startsWith(storageKey.current));
      
      roomKeys.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            const message = JSON.parse(value);
            if (message.from !== currentUserId.current) {
              handleLocalStorageMessage(value);
            }
          } catch (error) {
          }
        }
      });
    };

    // Vérifier les messages toutes les 2 secondes
    const interval = setInterval(checkExistingMessages, 2000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [handleLocalStorageMessage, storageKey]);

  // Se déconnecter
  const disconnect = useCallback(() => {
    
    // Fermer toutes les connexions peer
    peerConnectionsRef.current.forEach(peer => {
      peer.close();
    });
    peerConnectionsRef.current.clear();

    // Envoyer un message de leave
    sendLocalStorageMessage({
      type: 'leave',
      fromName: userName
    });

    setParticipants([]);
    setIsConnected(false);
    setConnectionStatus('disconnected');
  }, [sendLocalStorageMessage, userName]);

  // Envoyer un message chat
  const sendMessage = useCallback((message: string) => {
    if (isConnected) {
      sendLocalStorageMessage({
        type: 'chat',
        fromName: userName,
        message
      });
    }
  }, [userName, isConnected, sendLocalStorageMessage]);

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