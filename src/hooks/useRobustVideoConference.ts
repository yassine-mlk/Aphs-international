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
      
      const timestamp = new Date().toISOString();
      const payload = {
        signal,
        from: currentUserId,
        to,
        timestamp
      };

      console.log('📤 Sending broadcast webrtc-signal:', payload);

      channelRef.current.send({
        type: 'broadcast',
        event: 'webrtc-signal',
        payload
      })
        .then(() => {
          console.log(`✅ Signal ${signal.type} sent successfully to ${to}`);
        })
        .catch((error) => {
          console.error(`❌ Failed to send signal to ${to}:`, error);
        });
    } else {
      console.error('❌ No channel available to send signal');
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
      .catch(err => console.error('Error creating offer:', err));
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
    }).catch((err: any) => console.error('❌ Failed to send media-state:', err));
  }, [currentUserId]);

  // Traiter les signaux WebRTC reçus
  const handleRTCSignal = useCallback((payload: any) => {
    const { signal, from } = payload;
    
    console.log(`📥 Processing ${signal.type} from ${from}`);
    
    // Ignorer les signaux de nous-mêmes
    if (from === currentUserId) {
      console.log('📤 Ignoring signal from self');
      return;
    }

    upsertParticipant(from);
    
    // Trouver ou créer la connexion peer
    let peer = peersRef.current[from];
    if (!peer) {
      console.log(`🤝 Creating new peer connection for ${from}`);
      peer = createPeerConnection(from, false);
    }
    
    if (!peer) {
      console.error(`❌ Failed to create peer connection for ${from}`);
      return;
    }
    
    try {
      switch (signal.type) {
        case 'offer':
          console.log(`📥 Processing offer from ${from}`);
          peer.setRemoteDescription(new RTCSessionDescription(signal.sdp))
            .then(() => {
              console.log(`✅ Remote description set for ${from}`);
              return peer.createAnswer();
            })
            .then(answer => {
              console.log(`📤 Creating answer for ${from}`);
              return peer.setLocalDescription(answer);
            })
            .then(() => {
              console.log(`📤 Sending answer to ${from}`);
              sendRTCSignal(from, {
                type: 'answer',
                sdp: peer.localDescription
              });
            })
            .catch(err => console.error(`❌ Error processing offer from ${from}:`, err));
          break;
          
        case 'answer':
          console.log(`📥 Processing answer from ${from}`);
          peer.setRemoteDescription(new RTCSessionDescription(signal.sdp))
            .then(() => {
              console.log(`✅ Answer processed for ${from}`);
            })
            .catch(err => console.error(`❌ Error processing answer from ${from}:`, err));
          break;
          
        case 'ice-candidate':
          if (signal.candidate) {
            console.log(`📥 Processing ICE candidate from ${from}`);
            peer.addIceCandidate(new RTCIceCandidate(signal.candidate))
              .then(() => {
                console.log(`✅ ICE candidate added for ${from}`);
              })
              .catch(err => console.error(`❌ Error adding ICE candidate from ${from}:`, err));
          }
          break;
          
        default:
          console.warn(`⚠️ Unknown signal type: ${signal.type}`);
      }
    } catch (error) {
      console.error(`❌ Error handling signal from ${from}:`, error);
    }
  }, [currentUserId, sendRTCSignal]);

  // Se connecter à la room
  const connectToRoom = useCallback(async () => {
    if (!supabase || channelRef.current) {
      return;
    }

    try {
      console.log(`🚪 Connecting to room: ${roomId}`);
      console.log('🔧 Configuration:');
      console.log('- useRealtime:', config.useRealtime);
      console.log('- useRobustVideoConference:', config.useRobustVideoConference);
      console.log('- supabaseUrl:', config.supabaseUrl);
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
        console.log('📨 Signal WebRTC reçu:', payload);
        console.log('📨 Signal type:', payload.signal?.type);
        console.log('📨 Signal from:', payload.from);
        console.log('📨 Signal to:', payload.to);
        console.log('📨 Current user:', currentUserId);
        
        // Vérifier si le signal est pour nous ou en broadcast
        if (payload.to === currentUserId || payload.to === 'all' || payload.to === 'broadcast') {
          console.log('📥 Processing signal for current user');
          handleRTCSignal(payload);
        } else {
          console.log('📤 Ignoring signal - not for current user');
        }
      });

      channel.on('broadcast', { event: 'peer-hello' }, ({ payload }) => {
        console.log('👋 peer-hello raw payload:', payload);
        const { from, name } = payload || {};
        if (!from || from === currentUserId) return;
        console.log(`👋 peer-hello reçu de ${from}`);
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
          console.log(`✅ peer-welcome envoyé à ${from}`);
        }).catch((err: any) => console.error('❌ Failed to send peer-welcome:', err));
      });

      channel.on('broadcast', { event: 'peer-welcome' }, ({ payload }) => {
        console.log('🤝 peer-welcome raw payload:', payload);
        const { to, from, name } = payload || {};
        if (!to || to !== currentUserId) return;
        if (!from || from === currentUserId) return;
        console.log(`🤝 peer-welcome reçu de ${from}`);
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
          console.log('👥 Current presence state:', state);
          
          const participantIds = Object.keys(state).filter(id => id !== currentUserId);
          console.log(`👥 Room participants (${participantIds.length}):`, participantIds);
          
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
            
            console.log('👥 Updated participants list:', newParticipants);
            return newParticipants;
          });
          
          // Créer des connexions peer avec les participants existants
          participantIds.forEach(participantId => {
            if (!peersRef.current[participantId]) {
              console.log(`🤝 Preparing connection with existing participant: ${participantId}`);
              upsertParticipant(participantId, (state[participantId]?.[0] as any)?.name);
              maybeInitiateConnection(participantId);
            }
          });
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          if (key !== currentUserId) {
            console.log(`👋 User joined: ${key}`, newPresences);
            
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
                console.log('👥 Adding new participant:', newParticipant);
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
          console.log(`👋 User left: ${key}`, leftPresences);
          
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
          console.log(`📡 Supabase Realtime status: ${status}`);
          if (status === 'SUBSCRIBED') resolve();
          if (status === 'CHANNEL_ERROR') reject(new Error('CHANNEL_ERROR'));
          if (status === 'TIMED_OUT') reject(new Error('TIMED_OUT'));
        });
      });
      console.log('✅ Canal Supabase souscrit (SUBSCRIBED)');
      
      // Se présenter dans la room
      await channel.track({
        id: currentUserId,
        name: userName,
        joinedAt: new Date().toISOString()
      });
      console.log('✅ Présence envoyée dans la room');

      channel.send({
        type: 'broadcast',
        event: 'peer-hello',
        payload: {
          from: currentUserId,
          name: userName,
          timestamp: new Date().toISOString()
        }
      }).then(() => {
        console.log('✅ peer-hello envoyé');
      }).catch((err: any) => console.error('❌ Failed to send peer-hello:', err));

      setIsConnected(true);
      setConnectionStatus('connected');
      console.log('✅ Connected to video room');

    } catch (err) {
      console.error('❌ Failed to connect to room:', err);
      setError('Impossible de se connecter à la room');
      setConnectionStatus('error');
      onError?.('Impossible de se connecter à la room');
    }
  }, [supabase, roomId, currentUserId, userName, initializeLocalStream, createPeerConnection, sendRTCSignal, handleRTCSignal, onError, maybeInitiateConnection, upsertParticipant]);

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
        const nextAudioEnabled = !audioTrack.enabled;
        audioTrack.enabled = nextAudioEnabled;
        setIsAudioEnabled(nextAudioEnabled);
        sendMediaState({ audioEnabled: nextAudioEnabled, videoEnabled: isVideoEnabled });
        console.log('🎤 Audio toggled:', nextAudioEnabled);
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
        console.log('📹 Video toggled:', nextVideoEnabled);
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
      console.error('❌ Error toggling screen share:', error);
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
    console.log('🔄 Forçage de la reconnexion...');
    
    if (channelRef.current) {
      console.log('🛑 Fermeture du canal existant...');
      await channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    
    setConnectionStatus('connecting');
    setIsConnected(false);
    
    // Attendre un peu puis se reconnecter
    setTimeout(() => {
      console.log('🔄 Reconnexion à la room:', roomId);
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
