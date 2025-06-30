import { useEffect, useRef, useState, useCallback } from 'react';
import SimplePeer from 'simple-peer';
import { useAuth } from '../contexts/AuthContext';
import { useSupabase } from './useSupabase';
import { 
  checkWebRTCSupport, 
  defaultSimplePeerOptions, 
  getOptimalMediaConstraints,
  handleMediaError,
  cleanupMediaStream 
} from '../utils/webrtc';

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

  // Créer un ID de session unique pour distinguer les différents navigateurs/onglets
  const sessionId = useRef(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`).current;
  const currentUserId = user?.id ? `${user.id}_${sessionId}` : `anonymous_${sessionId}`;
  const displayName = userName || user?.email?.split('@')[0] || 'Utilisateur';
  
  console.log(`🆔 Current session ID: ${currentUserId}`);

  // Fonction pour attacher le stream local à l'élément vidéo
  const attachLocalStream = useCallback((videoElement: HTMLVideoElement) => {
    if (localStreamRef.current && videoElement) {
      videoElement.srcObject = localStreamRef.current;
      console.log('📺 Local stream attached to video element');
    }
  }, []);

  // Fonction pour obtenir le nom d'affichage d'un participant
  const getParticipantDisplayName = useCallback((participantId: string, participantData?: any) => {
    // Si c'est notre propre ID, retourner notre nom
    if (participantId === currentUserId) {
      return displayName;
    }
    
    // Extraire le vrai user ID du participantId (format: userID_session_timestamp_random)
    const userIdMatch = participantId.match(/^(.+)_session_\d+_[a-z0-9]+$/);
    const actualUserId = userIdMatch ? userIdMatch[1] : participantId;
    
    // Si on a des données de participant avec un nom, l'utiliser
    if (participantData?.user_name) {
      return participantData.user_name;
    }
    
    // Sinon, utiliser l'email si disponible, ou un nom basé sur l'ID
    if (actualUserId !== 'anonymous' && actualUserId.includes('@')) {
      return actualUserId.split('@')[0];
    }
    
    return actualUserId === 'anonymous' ? 'Utilisateur Anonyme' : `Utilisateur ${actualUserId.substring(0, 8)}`;
  }, [currentUserId, displayName]);

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

    try {
      const peerOptions = defaultSimplePeerOptions(
        initiator, 
        localStreamRef.current, 
        participantId
      );
      
      const peer = new SimplePeer(peerOptions);

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
        if (onError) {
          onError(new Error(`Peer connection error: ${err.message}`));
        }
      });

      // Gérer la fermeture
      peer.on('close', () => {
        console.log(`🔌 Peer connection closed: ${participantId}`);
        cleanupPeer(participantId);
      });

      return peer;
    } catch (error) {
      console.error(`❌ Failed to create peer connection with ${participantId}:`, error);
      if (onError) {
        onError(new Error(`Failed to create peer connection: ${error.message}`));
      }
      return null;
    }
  }, [sendSignal, cleanupPeer, onError]);

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
          const participantName = getParticipantDisplayName(from);
          return [...prev, {
            id: from,
            name: participantName,
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
    cleanupMediaStream(localStreamRef.current);
    localStreamRef.current = null;

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

    // Vérifier le support WebRTC
    const webrtcSupport = checkWebRTCSupport();
    if (!webrtcSupport.supported) {
      const error = new Error(webrtcSupport.error);
      console.error('❌ WebRTC not supported:', error);
      setError('WebRTC n\'est pas supporté dans ce navigateur');
      setConnectionStatus('error');
      if (onError) {
        onError(error);
      }
      return;
    }

    isInitializedRef.current = true;
    mountedRef.current = true;

    const initializeEverything = async () => {
      try {
        setConnectionStatus('connecting');
        
        // 1. Initialiser le stream local
        console.log('🎥 Initializing local media stream...');
        
        let stream: MediaStream;
        try {
          const mediaConstraints = getOptimalMediaConstraints('medium');
          stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
        } catch (mediaError) {
          console.error('❌ Failed to get user media:', mediaError);
          const errorMessage = handleMediaError(mediaError as Error);
          setError(errorMessage);
          setConnectionStatus('error');
          if (onError) {
            onError(new Error(`Media access denied: ${mediaError.message}`));
          }
          return;
        }

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
            const allParticipants = Object.keys(state);
            const participantIds = allParticipants.filter(id => id !== currentUserId);
            
            console.log(`👥 Room state sync - All: [${allParticipants.join(', ')}]`);
            console.log(`👥 Room participants (excluding me): ${participantIds.length} - [${participantIds.join(', ')}]`);
            console.log(`🆔 My ID: ${currentUserId}`);
            
            // Initier des connexions avec les participants existants
            participantIds.forEach(participantId => {
              if (!peersRef.current[participantId] && mountedRef.current) {
                console.log(`🤝 Initiating connection with existing participant: ${participantId}`);
                createPeerConnection(participantId, true);
                
                const participantData = state[participantId]?.[0];
                const participantName = getParticipantDisplayName(participantId, participantData);
                
                setParticipants(prev => {
                  if (!prev.find(p => p.id === participantId)) {
                    return [...prev, {
                      id: participantId,
                      name: participantName,
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
            console.log(`👋 Presence JOIN event - Key: ${key}, My ID: ${currentUserId}`);
            if (key !== currentUserId && mountedRef.current) {
              console.log(`✅ New participant joined (different from me): ${key}`);
              
              // Attendre un peu puis initier la connexion
              setTimeout(() => {
                if (mountedRef.current && !peersRef.current[key]) {
                  console.log(`🤝 Initiating P2P connection with new participant: ${key}`);
                  createPeerConnection(key, true);
                  
                  setParticipants(prev => {
                    if (!prev.find(p => p.id === key)) {
                      const participantName = getParticipantDisplayName(key);
                      return [...prev, {
                        id: key,
                        name: participantName,
                        isConnected: false,
                        joinedAt: new Date()
                      }];
                    }
                    return prev;
                  });
                } else {
                  console.log(`⚠️ Skip P2P connection - mounted: ${mountedRef.current}, existing peer: ${!!peersRef.current[key]}`);
                }
              }, 1000);
            } else {
              console.log(`⚠️ Skip JOIN - Same user (${key === currentUserId}) or unmounted (${!mountedRef.current})`);
            }
          })
          .on('presence', { event: 'leave' }, ({ key }) => {
            console.log(`👋 Presence LEAVE event - Key: ${key}, My ID: ${currentUserId}`);
            if (key !== currentUserId) {
              console.log(`✅ Participant left (different from me): ${key}`);
              cleanupPeer(key);
            } else {
              console.log(`⚠️ Skip LEAVE - Same user`);
            }
          });

        // S'abonner au canal
        await channel.subscribe(async (status) => {
          console.log(`📡 Realtime subscription status: ${status}`);
          
          if (status === 'SUBSCRIBED' && mountedRef.current) {
            setIsConnected(true);
            setConnectionStatus('connected');
            
            // S'annoncer comme présent avec l'ID unique de session
            await channel.track({
              user_id: currentUserId,
              user_name: displayName,
              original_user_id: user?.id,
              session_id: sessionId,
              joined_at: new Date().toISOString()
            });
            
            console.log(`✅ Successfully connected to room as: ${currentUserId}`);
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
    roomId,
    
    // New functions
    attachLocalStream,
    getParticipantDisplayName
  };
}; 