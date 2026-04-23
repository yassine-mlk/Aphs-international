import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface Participant {
  id: string;
  name: string;
  stream?: MediaStream;
  isConnected: boolean;
  isAudioEnabled?: boolean;
  isVideoEnabled?: boolean;
  isSpeaking?: boolean;
  networkQuality?: 'good' | 'unstable' | 'bad';
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
  messages: Array<{ id: string; from: string; fromName: string; message: string; timestamp: Date }>;
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
  const [messages, setMessages] = useState<Array<{ id: string; from: string; fromName: string; message: string; timestamp: Date }>>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const peersRef = useRef<{ [key: string]: RTCPeerConnection }>({});
  const currentUserId = useRef<string>(
    user?.id ?? `user_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  );
  const screenStreamRef = useRef<MediaStream | null>(null);
  const isConnectingRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const localAnalyserRef = useRef<AnalyserNode | null>(null);
  const localTalkingRef = useRef<boolean>(false);
  const statsIntervalRef = useRef<any>(null);
  const lastTalkingSentRef = useRef<number>(0);
  const talkingCandidateRef = useRef<boolean>(false);
  const talkingCandidateSinceRef = useRef<number>(0);

  const createParticipant = useCallback((id: string, name: string): Participant => ({
    id,
    name,
    isConnected: false,
    isAudioEnabled: true,
    isVideoEnabled: true,
    isSpeaking: false,
    networkQuality: 'good',
    joinedAt: new Date()
  }), []);

  // Configuration WebSocket
  const WS_URL =
    import.meta.env.VITE_WEBSOCKET_URL ||
    import.meta.env.VITE_WS_URL ||
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'ws://localhost:3001'
      : undefined);

  useEffect(() => {
    if (user?.id && currentUserId.current !== user.id) {
      currentUserId.current = user.id;
    }
  }, [user?.id]);

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
  const createPeerConnection = useCallback((participantId: string, isInitiator: boolean): RTCPeerConnection | null => {
    try {
      // Vérifier si la connexion existe déjà et la fermer si nécessaire
      if (peersRef.current[participantId]) {
        const existingPeer = peersRef.current[participantId];
        if (existingPeer && existingPeer.connectionState !== 'closed') {
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
            wsRef.current.send(JSON.stringify(message));
          }
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

      peersRef.current[participantId] = peer;
      return peer;
    } catch (err) {
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
      wsRef.current.send(JSON.stringify(fullMessage));
    } else {
    }
  }, [roomId]);

  // Traiter les messages WebSocket reçus
  const handleWebSocketMessage = useCallback((data: string) => {
    try {
      const message = JSON.parse(data);

      // Ignorer nos propres messages
      if (message.from === currentUserId.current) {
        return;
      }

      if (message.to && message.to !== currentUserId.current) {
        return;
      }

      switch (message.type) {
        case 'room-info':
          // Ajouter les participants existants
          setParticipants(message.participants.map((p: any) => ({
            id: p.id,
            name: p.name,
            isConnected: false,
            isAudioEnabled: true,
            isVideoEnabled: true,
            isSpeaking: false,
            networkQuality: 'good',
            joinedAt: new Date()
          })));

          // Créer des connexions avec les participants existants
          message.participants.forEach((participant: any) => {
            if (participant.id !== currentUserId.current) {
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
                  }
                }, 1000);
              }
            }
          });
          break;

        case 'user-joined':
          const joinedUserId = message.from || message.userId;
          const joinedUserName = message.fromName || message.userName;
          setParticipants(prev => {
            if (joinedUserId && !prev.find(p => p.id === joinedUserId)) {
              const newParticipant = createParticipant(joinedUserId, joinedUserName || 'Participant');

              // Créer une connexion peer avec le nouveau participant
              setTimeout(() => {
                const peer = createPeerConnection(joinedUserId, true);
                if (peer) {
                  // Créer une offre
                  peer.createOffer()
                    .then(offer => peer.setLocalDescription(offer))
                    .then(() => {
                      sendWebSocketMessage({
                        type: 'offer',
                        to: joinedUserId,
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

        case 'user-left':
          const leftUserId = message.from || message.userId;
          const leftUserName = message.fromName || message.userName;
          setParticipants(prev => prev.filter(p => p.id !== leftUserId));
          // Fermer la connexion peer
          const peerToClose = peersRef.current[leftUserId];
          if (peerToClose) {
            peerToClose.close();
            delete peersRef.current[leftUserId];
          }
          break;

        case 'offer':
          setParticipants(prev => {
            if (prev.some(p => p.id === message.from)) return prev;
            const np = createParticipant(message.from, message.fromName || 'Participant');
            return [...prev, np];
          });
          const offerPeer = createPeerConnection(message.from, false);
          if (offerPeer) {
            // Vérifier l'état avant de définir la description distante
            if (offerPeer.signalingState === 'stable' || offerPeer.signalingState === 'have-local-offer') {
              offerPeer.setRemoteDescription(new RTCSessionDescription(message.sdp))
                .then(() => {
                  return offerPeer.createAnswer();
                })
                .then(answer => offerPeer.setLocalDescription(answer))
                .then(() => {
                  sendWebSocketMessage({
                    type: 'answer',
                    to: message.from,
                    sdp: offerPeer.localDescription,
                    fromName: userName
                  });
                })
                .catch(err => {
                  // Si l'erreur est due à l'état, essayer de redémarrer la connexion
                  if (err.message.includes('wrong state')) {
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
                      }
                    }, 1000);
                  }
                });
            } else {
            }
          }
          break;

        case 'answer':
          setParticipants(prev => {
            if (prev.some(p => p.id === message.from)) return prev;
            const np = createParticipant(message.from, message.fromName || 'Participant');
            return [...prev, np];
          });
          const answerPeer = peersRef.current[message.from];
          if (answerPeer) {
            // Vérifier l'état avant de définir la description distante
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
          const icePeer = peersRef.current[message.from];
          if (icePeer && message.candidate) {
            icePeer.addIceCandidate(new RTCIceCandidate(message.candidate))
          }
          break;

        case 'media-state':
          if (typeof message.audioEnabled === 'boolean' || typeof message.videoEnabled === 'boolean') {
            setParticipants(prev => prev.map(p => {
              if (p.id !== message.from) return p;
              return {
                ...p,
                isAudioEnabled: typeof message.audioEnabled === 'boolean' ? message.audioEnabled : p.isAudioEnabled,
                isVideoEnabled: typeof message.videoEnabled === 'boolean' ? message.videoEnabled : p.isVideoEnabled
              };
            }));
          }
          break;
        case 'talking':
          if (typeof message.talking === 'boolean') {
            setParticipants(prev => prev.map(p => p.id === message.from ? { ...p, isSpeaking: message.talking } : p));
          }
          break;

        case 'chat':
          setMessages(prev => [...prev, {
            id: `${message.from}-${message.timestamp || Date.now()}`,
            from: message.from,
            fromName: message.fromName || message.from,
            message: message.text || message.message || '',
            timestamp: new Date(message.timestamp || Date.now())
          }]);
          break;

        default:
      }
    } catch (error) {
    }
  }, [userName, sendWebSocketMessage]);

  // Se connecter à la room
  const connectToRoom = useCallback(async () => {
    if (!user) {
      return;
    }

    if (isConnectingRef.current) {
      return;
    }

    try {
      isConnectingRef.current = true;
      setConnectionStatus('connecting');
      setError(null);

      if (!WS_URL) {
        const message =
          'Configuration WebSocket manquante. Définissez VITE_WS_URL (ou VITE_WEBSOCKET_URL) en production, ou lancez le serveur local ws://localhost:3001 en développement.';
        setError(message);
        setConnectionStatus('error');
        onError?.(message);
        return;
      }

      // Initialiser le stream local
      const stream = await initializeLocalStream();
      if (!stream) return;

      // Créer la connexion WebSocket
      const wsUrl = `${WS_URL}?roomId=${roomId}&userId=${currentUserId.current}&userName=${encodeURIComponent(userName)}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setConnectionStatus('connected');
      };

      ws.onmessage = (event) => {
        handleWebSocketMessage(event.data);
      };

      ws.onerror = (error) => {
        setError('Erreur de connexion WebSocket');
        setConnectionStatus('error');
      };

      ws.onclose = () => {
        setIsConnected(false);
        setConnectionStatus('disconnected');
      };

    } catch (error) {
      setError('Erreur de connexion à la room');
      setConnectionStatus('error');
    } finally {
      isConnectingRef.current = false;
    }
  }, [user, roomId, userName, initializeLocalStream, handleWebSocketMessage, WS_URL, onError]);

  // Se déconnecter
  const disconnect = useCallback(() => {
    
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
        const nextAudioEnabled = !audioTrack.enabled;
        audioTrack.enabled = nextAudioEnabled;
        setIsAudioEnabled(nextAudioEnabled);
        sendWebSocketMessage({
          type: 'media-state',
          audioEnabled: nextAudioEnabled,
          videoEnabled: isVideoEnabled
        });
      }
    }
  }, [localStream, sendWebSocketMessage, isVideoEnabled]);

  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        const nextVideoEnabled = !videoTrack.enabled;
        videoTrack.enabled = nextVideoEnabled;
        setIsVideoEnabled(nextVideoEnabled);
        sendWebSocketMessage({
          type: 'media-state',
          audioEnabled: isAudioEnabled,
          videoEnabled: nextVideoEnabled
        });
      }
    }
  }, [localStream, sendWebSocketMessage, isAudioEnabled]);

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
    }
  }, [isScreenSharing, localStream]);

  // Envoyer un message de chat
  const sendMessage = useCallback((message: string) => {
    setMessages(prev => [
      ...prev,
      {
        id: `${currentUserId.current}-${Date.now()}`,
        from: currentUserId.current,
        fromName: 'Moi',
        message,
        timestamp: new Date()
      }
    ]);
    sendWebSocketMessage({
      type: 'chat',
      text: message
    });
  }, [sendWebSocketMessage]);

  useEffect(() => {
    if (!localStream) return;
    try {
      if (!audioContextRef.current) audioContextRef.current = new AudioContext();
      const ctx = audioContextRef.current;
      if (!ctx) return;
      const source = ctx.createMediaStreamSource(localStream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      localAnalyserRef.current = analyser;
      let raf: number;
      const buf = new Uint8Array(1024);
      const loop = () => {
        if (!localAnalyserRef.current) return;
        localAnalyserRef.current.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buf.length);
        const detected = rms > 0.03;
        const now = Date.now();
        if (detected !== talkingCandidateRef.current) {
          talkingCandidateRef.current = detected;
          talkingCandidateSinceRef.current = now;
        }

        const stableFor = now - talkingCandidateSinceRef.current;
        const required = talkingCandidateRef.current ? 200 : 600;

        if (stableFor >= required && talkingCandidateRef.current !== localTalkingRef.current) {
          localTalkingRef.current = talkingCandidateRef.current;
          lastTalkingSentRef.current = now;
          sendWebSocketMessage({ type: 'talking', talking: localTalkingRef.current });
        }
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(raf);
    } catch {
      return;
    }
  }, [localStream, sendWebSocketMessage]);

  useEffect(() => {
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }
    statsIntervalRef.current = setInterval(async () => {
      const entries = Object.entries(peersRef.current);
      for (const [pid, pc] of entries) {
        try {
          const stats = await pc.getStats();
          let rtt = 0;
          let fractionLost = 0;
          stats.forEach(report => {
            if ((report.type === 'transport' || report.type === 'candidate-pair') && (report.currentRoundTripTime || report.roundTripTime)) {
              rtt = Number(report.currentRoundTripTime || report.roundTripTime || 0);
            }
            if (report.type === 'remote-inbound-rtp' && typeof report.fractionLost === 'number') {
              fractionLost = report.fractionLost;
            }
          });
          let quality: 'good' | 'unstable' | 'bad' = 'good';
          if (rtt > 0.6 || fractionLost > 0.05) quality = 'bad';
          else if (rtt > 0.2 || fractionLost > 0.02) quality = 'unstable';
          setParticipants(prev => prev.map(p => p.id === pid ? { ...p, networkQuality: quality } : p));
        } catch {
        }
      }
    }, 2000);
    return () => {
      if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    };
  }, []);
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
