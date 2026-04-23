import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { config } from '@/config/environment';
import { useSupabase } from '@/hooks/useSupabase';

interface Participant {
  id: string;
  name: string;
  stream?: MediaStream;
  isConnected: boolean;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isSpeaking?: boolean;
  networkQuality?: 'good' | 'unstable' | 'bad';
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
  messages: Array<{ id: string; from: string; fromName?: string; message: string; timestamp: Date }>;
}

export function useRobustVideoConference({
  roomId,
  userName,
  onError
}: UseRobustVideoConferenceProps): UseRobustVideoConferenceReturn {
  const { user } = useAuth();
  const { supabase } = useSupabase();

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
  const [messages, setMessages] = useState<Array<{ id: string; from: string; fromName?: string; message: string; timestamp: Date }>>([]);

  // Générer un ID unique pour cette session
  const currentUserId = useRef(user?.id || `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`).current;
  const audioContextRef = useRef<AudioContext | null>(null);
  const localAnalyserRef = useRef<AnalyserNode | null>(null);
  const localTalkingRef = useRef<boolean>(false);
  const statsIntervalRef = useRef<any>(null);
  const lastTalkingSentRef = useRef<number>(0);
  const talkingCandidateRef = useRef<boolean>(false);
  const talkingCandidateSinceRef = useRef<number>(0);

  // Initialiser le stream local
  const initializeLocalStream = useCallback(async () => {
    try {
      
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
      
      return stream;
    } catch (err) {
      setError('Impossible d\'accéder à la caméra/microphone');
      setConnectionStatus('error');
      onError?.('Impossible d\'accéder à la caméra/microphone');
      return null;
    }
  }, [onError]);

  // Créer une connexion peer-to-peer
  const createPeerConnection = useCallback((participantId: string, initiator: boolean = false) => {
    if (!localStreamRef.current) {
      return null;
    }

    if (peersRef.current[participantId]) {
      return peersRef.current[participantId];
    }


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
        sendRTCSignal(participantId, {
          type: 'ice-candidate',
          candidate: event.candidate
        });
      }
    };

    // Gérer le stream distant
    peer.ontrack = (event) => {
      
      setParticipants(prev => prev.map(p => 
        p.id === participantId 
          ? { ...p, stream: event.streams[0], isConnected: true }
          : p
      ));
    };

    // Gérer les changements de connexion
    peer.onconnectionstatechange = () => {
      
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
    };

    return peer;
  }, []);

  // Envoyer un signal WebRTC
  const sendRTCSignal = useCallback((to: string, signal: any) => {
    if (channelRef.current) {
      
      const timestamp = new Date().toISOString();
      const payload = {
        signal,
        from: currentUserId,
        to,
        timestamp
      };


      channelRef.current.send({
        type: 'broadcast',
        event: 'webrtc-signal',
        payload
      })
        .then(() => {
        })
        .catch((error) => {
        });
    } else {
    }
  }, [currentUserId]);

  const shouldInitiateOffer = useCallback((otherUserId: string) => {
    return currentUserId < otherUserId;
  }, [currentUserId]);

  const upsertParticipant = useCallback((id: string, name?: string) => {
    setParticipants(prev => {
      if (prev.some(p => p.id === id)) return prev;
      return [
        ...prev,
        {
          id,
          name: name || id.slice(0, 8) + '...',
          isConnected: false,
          isAudioEnabled: true,
          isVideoEnabled: true,
          isSpeaking: false,
          networkQuality: 'good',
          joinedAt: new Date()
        }
      ];
    });
  }, []);

  const maybeInitiateConnection = useCallback((otherUserId: string) => {
    if (!otherUserId || otherUserId === currentUserId) return;
    if (!localStreamRef.current) return;

    const initiator = shouldInitiateOffer(otherUserId);
    const peer = createPeerConnection(otherUserId, initiator);
    if (!peer) return;

    if (!initiator) return;
    if (peer.signalingState !== 'stable') return;

    peer.createOffer()
      .then(offer => peer.setLocalDescription(offer))
      .then(() => {
        sendRTCSignal(otherUserId, {
          type: 'offer',
          sdp: peer.localDescription
        });
      })
  }, [createPeerConnection, currentUserId, sendRTCSignal, shouldInitiateOffer]);

  const sendMediaState = useCallback((state: { audioEnabled: boolean; videoEnabled: boolean }) => {
    if (!channelRef.current) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'media-state',
      payload: {
        from: currentUserId,
        audioEnabled: state.audioEnabled,
        videoEnabled: state.videoEnabled,
        timestamp: new Date().toISOString()
      }
  }, [currentUserId]);

  // Traiter les signaux WebRTC reçus
  const handleRTCSignal = useCallback((payload: any) => {
    const { signal, from } = payload;
    
    
    // Ignorer les signaux de nous-mêmes
    if (from === currentUserId) {
      return;
    }

    upsertParticipant(from);
    
    // Trouver ou créer la connexion peer
    let peer = peersRef.current[from];
    if (!peer) {
      peer = createPeerConnection(from, false);
    }
    
    if (!peer) {
      return;
    }
    
    try {
      switch (signal.type) {
        case 'offer':
          peer.setRemoteDescription(new RTCSessionDescription(signal.sdp))
            .then(() => {
              return peer.createAnswer();
            })
            .then(answer => {
              return peer.setLocalDescription(answer);
            })
            .then(() => {
              sendRTCSignal(from, {
                type: 'answer',
                sdp: peer.localDescription
              });
            })
          break;
          
        case 'answer':
          peer.setRemoteDescription(new RTCSessionDescription(signal.sdp))
            .then(() => {
            })
          break;
          
        case 'ice-candidate':
          if (signal.candidate) {
            peer.addIceCandidate(new RTCIceCandidate(signal.candidate))
              .then(() => {
              })
          }
          break;
          
        default:
      }
    } catch (error) {
    }
  }, [currentUserId, sendRTCSignal]);

  // Se connecter à la room
  const connectToRoom = useCallback(async () => {
    if (!supabase || channelRef.current) {
      return;
    }

    try {
      setConnectionStatus('connecting');

      // Initialiser le stream local
      const stream = await initializeLocalStream();
      if (!stream) return;

      // Créer le canal Supabase Realtime
      const channel = supabase.channel(`video_room_${roomId}`, {
        config: {
          broadcast: { self: true, ack: true },
          presence: { key: currentUserId }
        }
      });

      channelRef.current = channel;

      // Écouter les signaux WebRTC
      channel.on('broadcast', { event: 'webrtc-signal' }, ({ payload }) => {
        
        // Vérifier si le signal est pour nous ou en broadcast
        if (payload.to === currentUserId || payload.to === 'all' || payload.to === 'broadcast') {
          handleRTCSignal(payload);
        } else {
        }
      });

      channel.on('broadcast', { event: 'peer-hello' }, ({ payload }) => {
        const { from, name } = payload || {};
        if (!from || from === currentUserId) return;
        upsertParticipant(from, name);
        maybeInitiateConnection(from);

        channel.send({
          type: 'broadcast',
          event: 'peer-welcome',
          payload: {
            to: from,
            from: currentUserId,
            name: userName,
            timestamp: new Date().toISOString()
          }
        }).then(() => {
      });

      channel.on('broadcast', { event: 'peer-welcome' }, ({ payload }) => {
        const { to, from, name } = payload || {};
        if (!to || to !== currentUserId) return;
        if (!from || from === currentUserId) return;
        upsertParticipant(from, name);
        maybeInitiateConnection(from);
      });

      // Écouter les messages de chat
      channel.on('broadcast', { event: 'chat-message' }, ({ payload }) => {
        const { from, message, timestamp, userName: senderName } = payload;
        if (from !== currentUserId) {
          setMessages(prev => [...prev, {
            id: `${from}-${timestamp}`,
            from,
            fromName: senderName || from,
            message,
            timestamp: new Date(timestamp)
          }]);
        }
      });

      channel.on('broadcast', { event: 'media-state' }, ({ payload }) => {
        const { from, audioEnabled, videoEnabled } = payload || {};
        if (!from || from === currentUserId) return;
        setParticipants(prev => prev.map(p => {
          if (p.id !== from) return p;
          return {
            ...p,
            isAudioEnabled: typeof audioEnabled === 'boolean' ? audioEnabled : p.isAudioEnabled,
            isVideoEnabled: typeof videoEnabled === 'boolean' ? videoEnabled : p.isVideoEnabled
          };
        }));
      });
      channel.on('broadcast', { event: 'talking' }, ({ payload }) => {
        const { from, talking } = payload || {};
        if (!from || typeof talking !== 'boolean') return;
        setParticipants(prev => prev.map(p => p.id === from ? { ...p, isSpeaking: talking } : p));
      });

      // Gérer les présences
      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          
          const participantIds = Object.keys(state).filter(id => id !== currentUserId);
          
          // Mettre à jour la liste des participants
          setParticipants(prev => {
            const newParticipants = participantIds.map(id => {
              const existing = prev.find(p => p.id === id);
              if (existing) {
                return existing;
              }
              return {
                id,
                name: (state[id]?.[0] as any)?.name || id.slice(0, 8) + '...',
                isConnected: false,
                isAudioEnabled: true,
                isVideoEnabled: true,
                joinedAt: new Date()
              };
            });
            
            return newParticipants;
          });
          
          // Créer des connexions peer avec les participants existants
          participantIds.forEach(participantId => {
            if (!peersRef.current[participantId]) {
              upsertParticipant(participantId, (state[participantId]?.[0] as any)?.name);
              maybeInitiateConnection(participantId);
            }
          });
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          if (key !== currentUserId) {
            
            // Ajouter le nouveau participant à la liste
            setParticipants(prev => {
              if (!prev.find(p => p.id === key)) {
                const newParticipant = {
                  id: key,
                  name: (newPresences?.[0] as any)?.name || key.slice(0, 8) + '...',
                  isConnected: false,
                  isAudioEnabled: true,
                  isVideoEnabled: true,
                  joinedAt: new Date()
                };
                return [...prev, newParticipant];
              }
              return prev;
            });

            // Créer une connexion peer avec le nouveau participant
            if (!peersRef.current[key]) {
              maybeInitiateConnection(key);
            }
          }
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          
          // Fermer la connexion peer
          if (peersRef.current[key]) {
            peersRef.current[key].close();
            delete peersRef.current[key];
          }
          
          setParticipants(prev => prev.filter(p => p.id !== key));
        });

      // Se connecter au canal
      await new Promise<void>((resolve, reject) => {
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') resolve();
          if (status === 'CHANNEL_ERROR') reject(new Error('CHANNEL_ERROR'));
          if (status === 'TIMED_OUT') reject(new Error('TIMED_OUT'));
        });
      });
      
      // Se présenter dans la room
      await channel.track({
        id: currentUserId,
        name: userName,
        joinedAt: new Date().toISOString()
      });

      channel.send({
        type: 'broadcast',
        event: 'peer-hello',
        payload: {
          from: currentUserId,
          name: userName,
          timestamp: new Date().toISOString()
        }
      }).then(() => {

      setIsConnected(true);
      setConnectionStatus('connected');

    } catch (err) {
      setError('Impossible de se connecter à la room');
      setConnectionStatus('error');
      onError?.('Impossible de se connecter à la room');
    }
  }, [supabase, roomId, currentUserId, userName, initializeLocalStream, createPeerConnection, sendRTCSignal, handleRTCSignal, onError, maybeInitiateConnection, upsertParticipant]);

  // Se déconnecter
  const disconnect = useCallback(() => {
    
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
        const nextAudioEnabled = !audioTrack.enabled;
        audioTrack.enabled = nextAudioEnabled;
        setIsAudioEnabled(nextAudioEnabled);
        sendMediaState({ audioEnabled: nextAudioEnabled, videoEnabled: isVideoEnabled });
      }
    }
  }, [isVideoEnabled, sendMediaState]);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        const nextVideoEnabled = !videoTrack.enabled;
        videoTrack.enabled = nextVideoEnabled;
        setIsVideoEnabled(nextVideoEnabled);
        sendMediaState({ audioEnabled: isAudioEnabled, videoEnabled: nextVideoEnabled });
      }
    }
  }, [isAudioEnabled, sendMediaState]);

  const toggleScreenShare = useCallback(async () => {
    try {
      if (isScreenSharing) {
        // Arrêter le partage d'écran
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(track => track.stop());
        }
        
        // Récupérer le stream caméra
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        
        localStreamRef.current = stream;
        setLocalStream(stream);
        setIsScreenSharing(false);
        
        // Mettre à jour les connexions peer
        Object.values(peersRef.current).forEach(peer => {
          const videoTrack = stream.getVideoTracks()[0];
          const sender = peer.getSenders().find(s => s.track?.kind === 'video');
          if (sender && videoTrack) {
            sender.replaceTrack(videoTrack);
          }
        });
      } else {
        // Démarrer le partage d'écran
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        localStreamRef.current = screenStream;
        setLocalStream(screenStream);
        setIsScreenSharing(true);
        
        // Mettre à jour les connexions peer
        Object.values(peersRef.current).forEach(peer => {
          const videoTrack = screenStream.getVideoTracks()[0];
          const sender = peer.getSenders().find(s => s.track?.kind === 'video');
          if (sender && videoTrack) {
            sender.replaceTrack(videoTrack);
          }
        });
        
        // Écouter la fin du partage d'écran
        screenStream.getVideoTracks()[0].onended = () => {
          toggleScreenShare();
        };
      }
    } catch (error) {
    }
  }, [isScreenSharing]);

  // Envoyer un message
  const sendMessage = useCallback((message: string) => {
    if (channelRef.current && message.trim()) {
      const timestamp = new Date().toISOString();
      channelRef.current.send({
        type: 'broadcast',
        event: 'chat-message',
        payload: {
          from: currentUserId,
          userName,
          message: message.trim(),
          timestamp
        }
      });
      
      // Ajouter le message local
      setMessages(prev => [...prev, {
        id: `${currentUserId}-${timestamp}`,
        from: currentUserId,
        fromName: 'Moi',
        message: message.trim(),
        timestamp: new Date(timestamp)
      }]);
    }
  }, [currentUserId, userName]);

  // Initialisation
  useEffect(() => {
    if (mountedRef.current) {
      connectToRoom();
    }

    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [connectToRoom, disconnect]);

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
          if (channelRef.current) {
            lastTalkingSentRef.current = now;
            channelRef.current.send({
              type: 'broadcast',
              event: 'talking',
              payload: { from: currentUserId, talking: localTalkingRef.current, timestamp: now }
            }).catch(() => undefined);
          }
        }
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(raf);
    } catch {
      return;
    }
  }, [localStream, currentUserId]);

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

  // Forcer la reconnexion au canal
  const forceReconnect = useCallback(async () => {
    
    if (channelRef.current) {
      await channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    
    setConnectionStatus('connecting');
    setIsConnected(false);
    
    // Attendre un peu puis se reconnecter
    setTimeout(() => {
      connectToRoom();
    }, 1000);
  }, [roomId, connectToRoom]);

  // Exposer la fonction de reconnexion
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).forceVideoReconnect = forceReconnect;
    }
  }, [forceReconnect]);

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
