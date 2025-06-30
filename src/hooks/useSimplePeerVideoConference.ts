import { useEffect, useRef, useState, useCallback } from 'react';
import SimplePeer from 'simple-peer';
import { useAuth } from '../contexts/AuthContext';
import { useSupabase } from './useSupabase';

interface UseSimplePeerVideoConferenceProps {
  roomId: string;
  userName?: string;
  onError?: (error: Error) => void;
}

interface Participant {
  id: string;
  name: string;
  stream?: MediaStream;
  isConnected: boolean;
  joinedAt: Date;
}

interface WebRTCSignal {
  type: 'signal';
  from: string;
  to: string;
  signal: any;
  roomId: string;
  timestamp: number;
}

export const useSimplePeerVideoConference = ({
  roomId,
  userName,
  onError
}: UseSimplePeerVideoConferenceProps) => {
  const { user } = useAuth();
  const { supabase } = useSupabase();
  
  // Refs pour éviter les rerenders
  const peersRef = useRef<{ [key: string]: SimplePeer.Instance }>({});
  const channelRef = useRef<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);
  const isInitializedRef = useRef(false);
  
  // States
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const currentUserId = user?.id || `anonymous_${Date.now()}`;
  const displayName = userName || user?.email?.split('@')[0] || 'Utilisateur';

  // Nettoyer une connexion peer
  const cleanupPeer = useCallback((participantId: string) => {
    console.log(`🧹 Cleaning up peer connection: ${participantId}`);
    
    const peer = peersRef.current[participantId];
    if (peer && !peer.destroyed) {
      try {
        peer.destroy();
      } catch (error) {
        console.warn('Error destroying peer:', error);
      }
    }
    delete peersRef.current[participantId];
    
    setParticipants(prev => prev.filter(p => p.id !== participantId));
  }, []);

  // Envoyer un signal WebRTC
  const sendSignal = useCallback(async (targetUserId: string, signal: any) => {
    if (!channelRef.current) {
      console.warn('Cannot send signal: not connected to room');
      return false;
    }

    try {
      const message: WebRTCSignal = {
        type: 'signal',
        from: currentUserId,
        to: targetUserId,
        signal,
        roomId,
        timestamp: Date.now()
      };

      console.log(`📡 Sending WebRTC signal to ${targetUserId}:`, signal.type);
      
      await channelRef.current.send({
        type: 'broadcast',
        event: 'webrtc_signal',
        payload: message
      });

      return true;
    } catch (error) {
      console.error('Failed to send WebRTC signal:', error);
      return false;
    }
  }, [currentUserId, roomId]);

  // Créer une connexion peer
  const createPeerConnection = useCallback((participantId: string, initiator: boolean = false) => {
    if (!localStreamRef.current) {
      console.warn('Cannot create peer connection: no local stream');
      return null;
    }

    if (peersRef.current[participantId]) {
      console.log(`Peer connection already exists for ${participantId}`);
      return peersRef.current[participantId];
    }

    console.log(`🔗 Creating peer connection with ${participantId}, initiator: ${initiator}`);

    const peer = new SimplePeer({
      initiator,
      trickle: false,
      stream: localStreamRef.current,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' }
        ]
      }
    });

    peersRef.current[participantId] = peer;

    // Gérer les signaux
    peer.on('signal', (signal) => {
      console.log(`📤 Sending signal to ${participantId}:`, signal.type);
      sendSignal(participantId, signal);
    });

    // Gérer le stream reçu
    peer.on('stream', (remoteStream) => {
      console.log(`🎥 Received stream from ${participantId}`);
      setParticipants(prev => prev.map(p => 
        p.id === participantId 
          ? { ...p, stream: remoteStream, isConnected: true }
          : p
      ));
    });

    // Gérer la connexion établie
    peer.on('connect', () => {
      console.log(`✅ Peer connected: ${participantId}`);
      setParticipants(prev => prev.map(p => 
        p.id === participantId 
          ? { ...p, isConnected: true }
          : p
      ));
    });

    // Gérer les erreurs
    peer.on('error', (err) => {
      console.error(`❌ Peer error with ${participantId}:`, err);
      cleanupPeer(participantId);
    });

    // Gérer la fermeture
    peer.on('close', () => {
      console.log(`🔌 Peer connection closed: ${participantId}`);
      cleanupPeer(participantId);
    });

    return peer;
  }, [sendSignal, cleanupPeer]);

  // Gérer les signaux WebRTC reçus
  const handleWebRTCSignal = useCallback((message: WebRTCSignal) => {
    const { from, to, signal, roomId: messageRoomId } = message;
    
    // Vérifications de sécurité
    if (messageRoomId !== roomId || from === currentUserId || to !== currentUserId) {
      return;
    }

    console.log(`📥 Received WebRTC signal from ${from}:`, signal.type);

    let peer = peersRef.current[from];
    
    // Créer un nouveau peer si nécessaire (pour les signaux entrants)
    if (!peer) {
      console.log(`Creating new peer connection for incoming signal from ${from}`);
      peer = createPeerConnection(from, false);
      
      // Ajouter le participant s'il n'existe pas
      setParticipants(prev => {
        if (!prev.find(p => p.id === from)) {
          return [...prev, {
            id: from,
            name: from.substring(0, 8),
            isConnected: false,
            joinedAt: new Date()
          }];
        }
        return prev;
      });
    }

    // Traiter le signal
    if (peer && !peer.destroyed) {
      try {
        peer.signal(signal);
      } catch (error) {
        console.error(`Error processing signal from ${from}:`, error);
        cleanupPeer(from);
      }
    }
  }, [roomId, currentUserId, createPeerConnection, cleanupPeer]);

  // Se déconnecter de la room
  const disconnectFromRoom = useCallback(async () => {
    console.log('🚪 Disconnecting from room...');
    
    // Marquer comme déconnecté pour éviter les actions supplémentaires
    mountedRef.current = false;
    
    // Nettoyer toutes les connexions peer
    Object.keys(peersRef.current).forEach(participantId => {
      cleanupPeer(participantId);
    });

    // Fermer le canal Supabase
    if (channelRef.current) {
      try {
        await channelRef.current.unsubscribe();
      } catch (error) {
        console.warn('Error unsubscribing from channel:', error);
      }
      channelRef.current = null;
    }

    // Arrêter le stream local
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      localStreamRef.current = null;
    }

    setLocalStream(null);
    setParticipants([]);
    setIsConnected(false);
    setConnectionStatus('idle');
    setError(null);
    isInitializedRef.current = false;
  }, [cleanupPeer]);

  // Contrôles média
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return audioTrack.enabled;
      }
    }
    return false;
  }, []);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return videoTrack.enabled;
      }
    }
    return false;
  }, []);

  const replaceVideoTrack = useCallback(async (newStream: MediaStream) => {
    if (!mountedRef.current) {
      newStream.getTracks().forEach(track => track.stop());
      return false;
    }

    try {
      // Remplacer le stream dans toutes les connexions peer
      const newVideoTrack = newStream.getVideoTracks()[0];
      
      Object.values(peersRef.current).forEach(peer => {
        if (peer && !peer.destroyed && peer.streams && peer.streams[0]) {
          const oldVideoTrack = peer.streams[0].getVideoTracks()[0];
          if (oldVideoTrack && newVideoTrack) {
            peer.replaceTrack(oldVideoTrack, newVideoTrack, peer.streams[0]);
          }
        }
      });

      // Arrêter l'ancien stream
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }

      localStreamRef.current = newStream;
      setLocalStream(newStream);
      
      return true;
    } catch (error) {
      console.error('Error replacing video track:', error);
      newStream.getTracks().forEach(track => track.stop());
      return false;
    }
  }, []);

  // Initialisation unique
  useEffect(() => {
    // Éviter la double initialisation
    if (isInitializedRef.current || !roomId) {
      return;
    }

    isInitializedRef.current = true;
    mountedRef.current = true;

    const initializeEverything = async () => {
      try {
        // 1. Initialiser le stream local
        console.log('🎥 Initializing local media stream...');
        
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 30 }
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });

        if (!mountedRef.current) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        localStreamRef.current = stream;
        setLocalStream(stream);
        console.log('✅ Local media stream initialized');

        // 2. Se connecter à la room
        if (!supabase || channelRef.current) {
          return;
        }

        console.log(`🚪 Connecting to room: ${roomId}`);
        setConnectionStatus('connecting');

        // Créer le canal Supabase Realtime
        const channel = supabase.channel(`simple_video_room_${roomId}`, {
          config: {
            broadcast: { self: false, ack: false },
            presence: { key: currentUserId }
          }
        });

        channelRef.current = channel;

        // Écouter les signaux WebRTC
        channel.on('broadcast', { event: 'webrtc_signal' }, ({ payload }) => {
          handleWebRTCSignal(payload);
        });

        // Gérer les présences
        channel
          .on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            const participantIds = Object.keys(state).filter(id => id !== currentUserId);
            
            console.log(`👥 Room participants: ${participantIds.length}`, participantIds);
            
            // Initier des connexions avec les participants existants
            participantIds.forEach(participantId => {
              if (!peersRef.current[participantId] && mountedRef.current) {
                console.log(`🤝 Initiating connection with existing participant: ${participantId}`);
                createPeerConnection(participantId, true);
                
                setParticipants(prev => {
                  if (!prev.find(p => p.id === participantId)) {
                    return [...prev, {
                      id: participantId,
                      name: participantId.substring(0, 8),
                      isConnected: false,
                      joinedAt: new Date()
                    }];
                  }
                  return prev;
                });
              }
            });
          })
          .on('presence', { event: 'join' }, ({ key }) => {
            if (key !== currentUserId && mountedRef.current) {
              console.log(`👋 New participant joined: ${key}`);
              
              // Attendre un peu puis initier la connexion
              setTimeout(() => {
                if (mountedRef.current && !peersRef.current[key]) {
                  console.log(`🤝 Initiating connection with new participant: ${key}`);
                  createPeerConnection(key, true);
                  
                  setParticipants(prev => {
                    if (!prev.find(p => p.id === key)) {
                      return [...prev, {
                        id: key,
                        name: key.substring(0, 8),
                        isConnected: false,
                        joinedAt: new Date()
                      }];
                    }
                    return prev;
                  });
                }
              }, 1000);
            }
          })
          .on('presence', { event: 'leave' }, ({ key }) => {
            if (key !== currentUserId) {
              console.log(`👋 Participant left: ${key}`);
              cleanupPeer(key);
            }
          });

        // S'abonner au canal
        await channel.subscribe(async (status) => {
          console.log(`📡 Realtime subscription status: ${status}`);
          
          if (status === 'SUBSCRIBED' && mountedRef.current) {
            setIsConnected(true);
            setConnectionStatus('connected');
            
            // S'annoncer comme présent
            await channel.track({
              user_id: currentUserId,
              user_name: displayName,
              joined_at: new Date().toISOString()
            });
            
            console.log('✅ Successfully connected to room');
          } else if (status === 'CHANNEL_ERROR') {
            setConnectionStatus('error');
            setError('Erreur de connexion à la room');
          }
        });

      } catch (error) {
        console.error('❌ Error during initialization:', error);
        setConnectionStatus('error');
        setError('Impossible d\'initialiser la vidéoconférence');
        
        if (onError) {
          onError(new Error('Erreur d\'initialisation'));
        }
      }
    };

    initializeEverything();

    return () => {
      disconnectFromRoom();
    };
  }, [roomId]); // Seulement roomId comme dépendance !

  return {
    // States
    localStream,
    participants,
    isConnected,
    connectionStatus,
    error,
    
    // Actions
    disconnectFromRoom,
    toggleAudio,
    toggleVideo,
    replaceVideoTrack,
    
    // Utils
    currentUserId,
    displayName,
    roomId
  };
}; 