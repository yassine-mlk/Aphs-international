import React, { useEffect, useRef, useState, useCallback } from 'react';
import SimplePeer from 'simple-peer';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  PhoneOff,
  Monitor,
  MonitorOff,
  Copy,
  Users,
  Circle,
  Loader2
} from 'lucide-react';
import { useToast } from './ui/use-toast';
import { useAuth } from '../contexts/AuthContext';
import { useSupabase } from '../hooks/useSupabase';

interface ImprovedVideoConferenceProps {
  roomId: string;
  userName?: string;
  onLeave?: () => void;
  onError?: (error: Error) => void;
}

interface Participant {
  id: string;
  name: string;
  stream?: MediaStream;
  peer?: SimplePeer.Instance;
  isConnected: boolean;
  joinedAt: Date;
}

interface RTCSignal {
  type: 'signal';
  from: string;
  to: string;
  signal: any;
  roomId: string;
}

interface RoomMessage {
  type: 'join' | 'leave' | 'signal';
  userId: string;
  userName: string;
  roomId: string;
  data?: any;
  timestamp: number;
}

const ImprovedVideoConference: React.FC<ImprovedVideoConferenceProps> = ({
  roomId,
  userName,
  onLeave,
  onError
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { supabase } = useSupabase();
  
  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideosRef = useRef<{ [key: string]: HTMLVideoElement }>({});
  const peersRef = useRef<{ [key: string]: SimplePeer.Instance }>({});
  const realtimeChannelRef = useRef<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
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

  const currentUserId = user?.id || `user_${Math.random().toString(36).substr(2, 9)}`;
  const displayName = userName || user?.email?.split('@')[0] || 'Utilisateur';

  // Nettoyer une connexion peer
  const cleanupPeer = useCallback((participantId: string) => {
    console.log(`🧹 Cleaning up peer: ${participantId}`);
    
    const peer = peersRef.current[participantId];
    if (peer && !peer.destroyed) {
      try {
        peer.destroy();
      } catch (error) {
        console.warn('Error destroying peer:', error);
      }
    }
    delete peersRef.current[participantId];
    
    // Nettoyer la référence vidéo
    const videoRef = remoteVideosRef.current[participantId];
    if (videoRef) {
      videoRef.srcObject = null;
      delete remoteVideosRef.current[participantId];
    }
    
    // Supprimer de la liste des participants
    setParticipants(prev => prev.filter(p => p.id !== participantId));
  }, []);

  // Envoyer un signal via Supabase Realtime
  const sendRTCSignal = useCallback(async (targetUserId: string, signal: any) => {
    if (!realtimeChannelRef.current) {
      console.warn('❌ Cannot send signal: no realtime channel');
      return;
    }

    const message: RTCSignal = {
      type: 'signal',
      from: currentUserId,
      to: targetUserId,
      signal,
      roomId
    };

    try {
      console.log(`📡 Sending WebRTC signal to ${targetUserId}`);
      await realtimeChannelRef.current.send({
        type: 'broadcast',
        event: 'webrtc_signal',
        payload: message
      });
    } catch (error) {
      console.error('❌ Failed to send RTC signal:', error);
    }
  }, [currentUserId, roomId]);

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

    const peer = new SimplePeer({
      initiator,
      trickle: false,
      stream: localStreamRef.current,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' }
        ]
      }
    });

    peersRef.current[participantId] = peer;

    // Gérer les signaux WebRTC
    peer.on('signal', (signal) => {
      console.log(`📤 Signal from peer ${participantId}:`, signal.type);
      sendRTCSignal(participantId, signal);
    });

    // Gérer le stream distant reçu
    peer.on('stream', (remoteStream) => {
      console.log(`🎥 Received remote stream from ${participantId}`);
      
      // Mettre à jour le participant avec le stream
      setParticipants(prev => prev.map(p => 
        p.id === participantId 
          ? { ...p, stream: remoteStream, isConnected: true }
          : p
      ));

      // Attacher le stream à l'élément vidéo
      setTimeout(() => {
        const videoElement = remoteVideosRef.current[participantId];
        if (videoElement && remoteStream.active) {
          videoElement.srcObject = remoteStream;
          console.log(`📺 Stream attached to video element for ${participantId}`);
        }
      }, 100);
    });

    // Gérer les connexions établies
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

    // Gérer les fermetures de connexion
    peer.on('close', () => {
      console.log(`🔌 Peer closed: ${participantId}`);
      cleanupPeer(participantId);
    });

    return peer;
  }, [sendRTCSignal, cleanupPeer]);

  // Gérer les signaux WebRTC reçus
  const handleRTCSignal = useCallback((message: RTCSignal) => {
    const { from, to, signal } = message;
    
    // Ignorer si le message n'est pas pour nous
    if (to !== currentUserId || from === currentUserId) {
      return;
    }

    console.log(`📥 Received WebRTC signal from ${from}:`, signal.type);

    let peer = peersRef.current[from];
    
    // Créer un nouveau peer si nécessaire (non-initiateur)
    if (!peer) {
      console.log(`🆕 Creating new peer for incoming signal from ${from}`);
      peer = createPeerConnection(from, false);
      
      // Ajouter le participant s'il n'existe pas
      setParticipants(prev => {
        if (!prev.find(p => p.id === from)) {
          return [...prev, {
            id: from,
            name: from.slice(0, 8) + '...',
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
        console.error(`❌ Error processing signal from ${from}:`, error);
        cleanupPeer(from);
      }
    }
  }, [currentUserId, createPeerConnection, cleanupPeer]);

  // Initialiser le stream local
  const initializeLocalStream = useCallback(async () => {
    try {
      console.log('🎥 Initializing local media stream...');
      
      const constraints = {
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
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (!mountedRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return null;
      }

      localStreamRef.current = stream;
      setLocalStream(stream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true;
      }

      console.log('✅ Local media stream initialized successfully');
      return stream;
    } catch (error) {
      console.error('❌ Error accessing media:', error);
      setError('Impossible d\'accéder à la caméra/microphone');
      setConnectionStatus('error');
      
      if (onError) {
        onError(new Error('Accès média refusé'));
      }
      
      return null;
    }
  }, [onError]);

  // Se connecter à la room Supabase
  const connectToRoom = useCallback(async () => {
    if (!supabase || realtimeChannelRef.current) {
      return;
    }

    try {
      console.log(`🚪 Connecting to room: ${roomId}`);
      setConnectionStatus('connecting');

      // Créer le canal Supabase Realtime
      const channel = supabase.channel(`video_room_${roomId}`, {
        config: {
          broadcast: { self: false, ack: false },
          presence: { key: currentUserId }
        }
      });

      realtimeChannelRef.current = channel;

      // Écouter les signaux WebRTC
      channel.on('broadcast', { event: 'webrtc_signal' }, ({ payload }) => {
        handleRTCSignal(payload);
      });

      // Gérer les présences (participants)
      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const participantIds = Object.keys(state).filter(id => id !== currentUserId);
          
          console.log(`👥 Room participants (${participantIds.length}):`, participantIds);
          
          // Créer des connexions peer avec les participants existants
          participantIds.forEach(participantId => {
            if (!peersRef.current[participantId]) {
              console.log(`🤝 Initiating connection with existing participant: ${participantId}`);
              createPeerConnection(participantId, true);
              
              // Ajouter à la liste des participants
              setParticipants(prev => {
                if (!prev.find(p => p.id === participantId)) {
                  return [...prev, {
                    id: participantId,
                    name: participantId.slice(0, 8) + '...',
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
          if (key !== currentUserId) {
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
                      name: key.slice(0, 8) + '...',
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
        
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setConnectionStatus('connected');
          
          // S'annoncer comme présent
          await channel.track({
            user_id: currentUserId,
            user_name: displayName,
            joined_at: new Date().toISOString()
          });
          
          toast({
            title: "Connecté à la room",
            description: `Vous avez rejoint la room ${roomId}`,
          });
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionStatus('error');
          setError('Erreur de connexion à la room');
        }
      });

    } catch (error) {
      console.error('❌ Error connecting to room:', error);
      setConnectionStatus('error');
      setError('Impossible de se connecter à la room');
      
      if (onError) {
        onError(new Error('Erreur de connexion à la room'));
      }
    }
  }, [supabase, roomId, currentUserId, displayName, handleRTCSignal, createPeerConnection, cleanupPeer, toast, onError]);

  // Se déconnecter de la room
  const disconnectFromRoom = useCallback(async () => {
    console.log('🚪 Disconnecting from room...');
    
    // Nettoyer toutes les connexions peer
    Object.keys(peersRef.current).forEach(participantId => {
      cleanupPeer(participantId);
    });

    // Fermer le canal Supabase
    if (realtimeChannelRef.current) {
      try {
        await realtimeChannelRef.current.unsubscribe();
      } catch (error) {
        console.warn('Error unsubscribing from channel:', error);
      }
      realtimeChannelRef.current = null;
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
    setConnectionStatus('disconnected');
    
    if (onLeave) {
      onLeave();
    }
  }, [cleanupPeer, onLeave]);

  // Contrôles média
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        
        toast({
          title: audioTrack.enabled ? "Micro activé" : "Micro désactivé",
          description: audioTrack.enabled ? "Votre micro est maintenant activé" : "Votre micro est maintenant désactivé",
        });
      }
    }
  }, [toast]);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
        
        toast({
          title: videoTrack.enabled ? "Vidéo activée" : "Vidéo désactivée",
          description: videoTrack.enabled ? "Votre vidéo est maintenant activée" : "Votre vidéo est maintenant désactivée",
        });
      }
    }
  }, [toast]);

  const toggleScreenShare = useCallback(async () => {
    try {
      if (isScreenSharing) {
        // Arrêter le partage d'écran - revenir à la caméra
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        
        if (!mountedRef.current) {
          newStream.getTracks().forEach(track => track.stop());
          return;
        }
        
        // Remplacer le stream dans toutes les connexions peer
        Object.values(peersRef.current).forEach(peer => {
          if (peer && !peer.destroyed && peer.streams && peer.streams[0]) {
            const oldVideoTrack = peer.streams[0].getVideoTracks()[0];
            const newVideoTrack = newStream.getVideoTracks()[0];
            
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
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = newStream;
        }
        
        setIsScreenSharing(false);
        toast({
          title: "Partage d'écran arrêté",
          description: "Retour à la caméra"
        });
        
      } else {
        // Démarrer le partage d'écran
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' },
          audio: true
        });
        
        if (!mountedRef.current) {
          screenStream.getTracks().forEach(track => track.stop());
          return;
        }
        
        // Remplacer le stream dans toutes les connexions peer
        Object.values(peersRef.current).forEach(peer => {
          if (peer && !peer.destroyed && peer.streams && peer.streams[0]) {
            const oldVideoTrack = peer.streams[0].getVideoTracks()[0];
            const newVideoTrack = screenStream.getVideoTracks()[0];
            
            if (oldVideoTrack && newVideoTrack) {
              peer.replaceTrack(oldVideoTrack, newVideoTrack, peer.streams[0]);
            }
          }
        });
        
        // Arrêter l'ancien stream
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(track => track.stop());
        }
        
        localStreamRef.current = screenStream;
        setLocalStream(screenStream);
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        
        setIsScreenSharing(true);
        toast({
          title: "Partage d'écran démarré",
          description: "Votre écran est maintenant partagé"
        });
        
        // Écouter la fin du partage d'écran
        screenStream.getVideoTracks()[0].onended = () => {
          if (mountedRef.current) {
            toggleScreenShare();
          }
        };
      }
    } catch (error) {
      console.error('❌ Error toggling screen share:', error);
      toast({
        title: "Erreur partage d'écran",
        description: "Impossible de partager l'écran",
        variant: "destructive"
      });
    }
  }, [isScreenSharing, toast]);

  const copyRoomId = useCallback(() => {
    navigator.clipboard.writeText(roomId);
    toast({
      title: "ID de room copié",
      description: `${roomId} copié dans le presse-papiers`,
    });
  }, [roomId, toast]);

  // Initialisation
  useEffect(() => {
    mountedRef.current = true;

    const initialize = async () => {
      if (!mountedRef.current) return;
      
      const stream = await initializeLocalStream();
      if (stream && mountedRef.current) {
        await connectToRoom();
      }
    };

    initialize();

    return () => {
      mountedRef.current = false;
      disconnectFromRoom();
    };
  }, [initializeLocalStream, connectToRoom, disconnectFromRoom]);

  // Interface de chargement
  if (connectionStatus === 'connecting') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <Card className="w-96 bg-gray-800 border-gray-700">
          <CardContent className="p-6 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">
              Connexion en cours...
            </h3>
            <p className="text-gray-400">
              Initialisation de la vidéoconférence
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Interface d'erreur
  if (connectionStatus === 'error') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <Card className="w-96 bg-gray-800 border-red-700">
          <CardContent className="p-6 text-center">
            <div className="text-red-500 mb-4">
              <VideoOff className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">
              Erreur de connexion
            </h3>
            <p className="text-gray-400 mb-4">
              {error || 'Une erreur est survenue'}
            </p>
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline"
              className="text-gray-300 border-gray-600 hover:bg-gray-700"
            >
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* En-tête de la room */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  Vidéoconférence
                  <Badge variant={isConnected ? "default" : "secondary"} className="bg-green-600 text-white">
                    <Circle className="h-2 w-2 mr-1 fill-current" />
                    {isConnected ? 'Connecté' : 'Déconnecté'}
                  </Badge>
                </CardTitle>
                <p className="text-gray-400 text-sm mt-1">
                  Room: {roomId} • {participants.length + 1} participant(s)
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyRoomId}
                  className="text-gray-300 border-gray-600 hover:bg-gray-700"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copier ID
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={disconnectFromRoom}
                >
                  <PhoneOff className="h-4 w-4 mr-2" />
                  Quitter
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Zone vidéo principale */}
        <div className="space-y-4">
          {/* Vidéo locale */}
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video max-w-md mx-auto">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-1 rounded text-sm">
                  {displayName} (Vous)
                </div>
                {!isVideoEnabled && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
                    <VideoOff className="h-12 w-12 text-gray-400" />
                  </div>
                )}
                {isScreenSharing && (
                  <div className="absolute top-4 left-4 bg-green-600 text-white px-2 py-1 rounded text-xs">
                    Partage d'écran
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Vidéos des participants */}
          {participants.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {participants.map((participant) => (
                <Card key={participant.id} className="bg-gray-800 border-gray-700">
                  <CardContent className="p-4">
                    <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
                      <video
                        ref={(el) => {
                          if (el) remoteVideosRef.current[participant.id] = el;
                        }}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-1 rounded text-sm flex items-center gap-2">
                        <Circle 
                          className={`h-2 w-2 fill-current ${
                            participant.isConnected ? 'text-green-400' : 'text-yellow-400'
                          }`} 
                        />
                        {participant.name}
                      </div>
                      {!participant.stream && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
                          <div className="text-center text-white">
                            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <div className="text-sm opacity-75">
                              {participant.isConnected ? 'Connexion...' : 'En attente...'}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Contrôles */}
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex justify-center gap-4">
              <Button
                variant={isAudioEnabled ? "default" : "destructive"}
                size="lg"
                onClick={toggleAudio}
                className="rounded-full w-12 h-12 p-0"
                title={isAudioEnabled ? "Désactiver le micro" : "Activer le micro"}
              >
                {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </Button>

              <Button
                variant={isVideoEnabled ? "default" : "destructive"}
                size="lg"
                onClick={toggleVideo}
                className="rounded-full w-12 h-12 p-0"
                title={isVideoEnabled ? "Désactiver la vidéo" : "Activer la vidéo"}
              >
                {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </Button>

              <Button
                variant={isScreenSharing ? "secondary" : "outline"}
                size="lg"
                onClick={toggleScreenShare}
                className="rounded-full w-12 h-12 p-0"
                title={isScreenSharing ? "Arrêter le partage" : "Partager l'écran"}
              >
                {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ImprovedVideoConference; 