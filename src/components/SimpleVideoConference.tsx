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
  Settings,
  Volume2,
  VolumeX
} from 'lucide-react';
import { useToast } from './ui/use-toast';
import { useAuth } from '../contexts/AuthContext';
import { useSupabase } from '../hooks/useSupabase';

interface SimpleVideoConferenceProps {
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
  isHost: boolean;
  joinedAt: string;
}

interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'user-joined' | 'user-left';
  from: string;
  to?: string;
  data: any;
  timestamp: string;
}

const SimpleVideoConference: React.FC<SimpleVideoConferenceProps> = ({
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
  const channelRef = useRef<any>(null);
  const isInitialized = useRef(false);
  
  // States
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);

  const currentUserId = user?.id || 'anonymous';
  const displayName = userName || user?.email || 'Utilisateur';

  // Initialiser le stream local
  const initializeLocalStream = useCallback(async () => {
    try {
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

      setLocalStream(stream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true;
      }

      console.log('✅ Local media stream initialized');
      
      toast({
        title: "Média initialisé",
        description: "Caméra et microphone activés",
      });

      return stream;
    } catch (error) {
      console.error('❌ Error accessing media:', error);
      const errorMessage = 'Impossible d\'accéder à la caméra/microphone';
      setConnectionError(errorMessage);
      
      toast({
        title: "Erreur média",
        description: errorMessage,
        variant: "destructive",
      });
      
      if (onError) {
        onError(new Error(errorMessage));
      }
      
      return null;
    }
  }, [toast, onError]);

  // Créer une connexion peer-to-peer
  const createPeerConnection = useCallback((participantId: string, initiator: boolean = false) => {
    if (!localStream) {
      console.warn('⚠️ Cannot create peer connection: no local stream');
      return null;
    }

    if (peersRef.current[participantId]) {
      console.log(`ℹ️ Peer connection already exists for ${participantId}`);
      return peersRef.current[participantId];
    }

    console.log(`🔗 Creating peer connection with ${participantId}, initiator: ${initiator}`);

    const peer = new SimplePeer({
      initiator,
      trickle: false,
      stream: localStream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' }
        ]
      }
    });

    peersRef.current[participantId] = peer;

    // Gérer les signaux WebRTC
    peer.on('signal', (signal) => {
      console.log(`📡 Sending signal to ${participantId}:`, signal.type);
      sendSignalingMessage({
        type: signal.type === 'offer' ? 'offer' : 'answer',
        from: currentUserId,
        to: participantId,
        data: signal,
        timestamp: new Date().toISOString()
      });
    });

    // Gérer le stream distant
    peer.on('stream', (remoteStream) => {
      console.log(`🎥 Received stream from ${participantId}`);
      
      setParticipants(prev => prev.map(p => 
        p.id === participantId 
          ? { ...p, stream: remoteStream }
          : p
      ));

      // Attacher le stream au élément vidéo
      setTimeout(() => {
        const videoElement = remoteVideosRef.current[participantId];
        if (videoElement && remoteStream) {
          videoElement.srcObject = remoteStream;
          console.log(`📺 Stream attached to video element for ${participantId}`);
        }
      }, 100);
    });

    // Gérer la connexion établie
    peer.on('connect', () => {
      console.log(`🤝 Peer connected: ${participantId}`);
      toast({
        title: "Connexion établie",
        description: `Connecté avec ${participantId}`,
      });
    });

    // Gérer les erreurs
    peer.on('error', (error) => {
      console.error(`❌ Peer error with ${participantId}:`, error);
      cleanupPeerConnection(participantId);
      
      toast({
        title: "Erreur de connexion",
        description: `Problème avec ${participantId}`,
        variant: "destructive",
      });
    });

    // Gérer la fermeture de connexion
    peer.on('close', () => {
      console.log(`🔌 Peer connection closed: ${participantId}`);
      cleanupPeerConnection(participantId);
    });

    return peer;
  }, [localStream, currentUserId, toast]);

  // Nettoyer une connexion peer
  const cleanupPeerConnection = useCallback((participantId: string) => {
    console.log(`🧹 Cleaning up peer connection: ${participantId}`);
    
    const peer = peersRef.current[participantId];
    if (peer && !peer.destroyed) {
      peer.destroy();
    }
    delete peersRef.current[participantId];
    
    setParticipants(prev => prev.filter(p => p.id !== participantId));
    
    const videoElement = remoteVideosRef.current[participantId];
    if (videoElement) {
      videoElement.srcObject = null;
      delete remoteVideosRef.current[participantId];
    }
  }, []);

  // Envoyer un message de signalisation
  const sendSignalingMessage = useCallback(async (message: SignalingMessage) => {
    if (!channelRef.current || !isConnected) {
      console.warn('⚠️ Cannot send signaling message: not connected');
      return;
    }

    try {
      console.log(`📡 Sending signaling message:`, message.type);
      await channelRef.current.send({
        type: 'broadcast',
        event: 'webrtc-signal',
        payload: message
      });
    } catch (error) {
      console.error('❌ Failed to send signaling message:', error);
    }
  }, [isConnected]);

  // Gérer les messages de signalisation reçus
  const handleSignalingMessage = useCallback((message: SignalingMessage) => {
    const { type, from, to, data } = message;
    
    // Ignorer nos propres messages
    if (from === currentUserId) return;
    
    // Vérifier si le message nous est destiné
    if (to && to !== currentUserId) return;

    console.log(`📨 Received signaling message from ${from}:`, type);

    switch (type) {
      case 'user-joined':
        // Nouveau participant rejoint
        if (!participants.find(p => p.id === from)) {
          const newParticipant: Participant = {
            id: from,
            name: data.name || from,
            isHost: data.isHost || false,
            joinedAt: message.timestamp
          };
          
          setParticipants(prev => [...prev, newParticipant]);
          
          // En tant qu'utilisateur existant, initier la connexion
          setTimeout(() => {
            createPeerConnection(from, true);
          }, 500);
        }
        break;

      case 'user-left':
        // Participant quitte
        cleanupPeerConnection(from);
        break;

      case 'offer':
      case 'answer':
        // Signal WebRTC
        const peer = peersRef.current[from] || createPeerConnection(from, false);
        if (peer && !peer.destroyed) {
          try {
            peer.signal(data);
          } catch (error) {
            console.error(`❌ Error processing signal from ${from}:`, error);
          }
        }
        break;

      default:
        console.warn(`⚠️ Unknown signaling message type: ${type}`);
    }
  }, [currentUserId, participants, createPeerConnection, cleanupPeerConnection]);

  // Rejoindre la room
  const joinRoom = useCallback(async () => {
    if (!supabase || isInitialized.current) return;

    console.log(`🚪 Joining room: ${roomId}`);
    isInitialized.current = true;

    try {
      // Créer le canal Supabase Realtime
      const channel = supabase.channel(`video-room-${roomId}`, {
        config: {
          broadcast: { self: false },
          presence: { key: currentUserId }
        }
      });

      channelRef.current = channel;

      // Écouter les messages de signalisation
      channel.on('broadcast', { event: 'webrtc-signal' }, ({ payload }) => {
        handleSignalingMessage(payload);
      });

      // Gérer les présences (participants)
      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const existingParticipants = Object.keys(state).filter(id => id !== currentUserId);
          
          console.log(`👥 Room participants: ${existingParticipants.length}`, existingParticipants);
          
          // Déterminer si nous sommes l'hôte (premier à rejoindre)
          const isFirstParticipant = existingParticipants.length === 0;
          setIsHost(isFirstParticipant);
          
          // Mettre à jour la liste des participants
          const newParticipants: Participant[] = existingParticipants.map(id => ({
            id,
            name: state[id]?.[0]?.name || id,
            isHost: state[id]?.[0]?.isHost || false,
            joinedAt: state[id]?.[0]?.joinedAt || new Date().toISOString()
          }));
          
          setParticipants(newParticipants);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          if (key !== currentUserId) {
            console.log(`👋 User joined: ${key}`);
            const presence = newPresences[0];
            
            // Annoncer aux autres qu'un nouvel utilisateur a rejoint
            setTimeout(() => {
              sendSignalingMessage({
                type: 'user-joined',
                from: currentUserId,
                data: {
                  name: displayName,
                  isHost
                },
                timestamp: new Date().toISOString()
              });
            }, 1000);
          }
        })
        .on('presence', { event: 'leave' }, ({ key }) => {
          if (key !== currentUserId) {
            console.log(`👋 User left: ${key}`);
            cleanupPeerConnection(key);
          }
        });

      // S'abonner au canal
      await channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to room channel');
          setIsConnected(true);
          
          // S'annoncer comme présent
          await channel.track({
            name: displayName,
            isHost,
            joinedAt: new Date().toISOString()
          });
          
          toast({
            title: "Connecté à la room",
            description: `Vous avez rejoint ${roomId}`,
          });
        }
      });

    } catch (error) {
      console.error('❌ Error joining room:', error);
      setConnectionError('Impossible de rejoindre la room');
      if (onError) {
        onError(new Error('Erreur de connexion à la room'));
      }
    }
  }, [supabase, roomId, currentUserId, displayName, isHost, handleSignalingMessage, sendSignalingMessage, cleanupPeerConnection, toast, onError]);

  // Quitter la room
  const leaveRoom = useCallback(async () => {
    console.log('🚪 Leaving room...');

    // Annoncer le départ
    if (channelRef.current && isConnected) {
      await sendSignalingMessage({
        type: 'user-left',
        from: currentUserId,
        data: {},
        timestamp: new Date().toISOString()
      });
    }

    // Nettoyer toutes les connexions peer
    Object.keys(peersRef.current).forEach(participantId => {
      cleanupPeerConnection(participantId);
    });

    // Fermer le canal
    if (channelRef.current) {
      await channelRef.current.unsubscribe();
      channelRef.current = null;
    }

    // Arrêter le stream local
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }

    setIsConnected(false);
    setParticipants([]);
    isInitialized.current = false;

    if (onLeave) {
      onLeave();
    }
  }, [isConnected, currentUserId, sendSignalingMessage, cleanupPeerConnection, localStream, onLeave]);

  // Contrôles média
  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        
        toast({
          title: audioTrack.enabled ? "Micro activé" : "Micro désactivé",
          description: audioTrack.enabled ? "Votre micro est maintenant activé" : "Votre micro est maintenant désactivé",
        });
      }
    }
  }, [localStream, toast]);

  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
        
        toast({
          title: videoTrack.enabled ? "Vidéo activée" : "Vidéo désactivée",
          description: videoTrack.enabled ? "Votre vidéo est maintenant activée" : "Votre vidéo est maintenant désactivée",
        });
      }
    }
  }, [localStream, toast]);

  const toggleScreenShare = useCallback(async () => {
    try {
      if (isScreenSharing) {
        // Arrêter le partage d'écran
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        
        // Remplacer le stream dans toutes les connexions peer
        Object.values(peersRef.current).forEach(peer => {
          if (peer && !peer.destroyed) {
            peer.replaceTrack(
              peer.streams[0].getVideoTracks()[0],
              stream.getVideoTracks()[0],
              peer.streams[0]
            );
          }
        });
        
        setIsScreenSharing(false);
        toast({
          title: "Partage d'écran arrêté",
          description: "Retour à la caméra"
        });
      } else {
        // Démarrer le partage d'écran
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        setLocalStream(screenStream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        
        // Remplacer le stream dans toutes les connexions peer
        Object.values(peersRef.current).forEach(peer => {
          if (peer && !peer.destroyed) {
            peer.replaceTrack(
              peer.streams[0].getVideoTracks()[0],
              screenStream.getVideoTracks()[0],
              peer.streams[0]
            );
          }
        });
        
        setIsScreenSharing(true);
        toast({
          title: "Partage d'écran démarré",
          description: "Votre écran est maintenant partagé"
        });
        
        // Écouter la fin du partage d'écran
        screenStream.getVideoTracks()[0].onended = () => {
          toggleScreenShare();
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

  // Initialisation au montage
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      if (!mounted) return;
      
      const stream = await initializeLocalStream();
      if (stream && mounted) {
        await joinRoom();
      }
    };

    initialize();

    return () => {
      mounted = false;
      leaveRoom();
    };
  }, [initializeLocalStream, joinRoom, leaveRoom]);

  // Interface de chargement
  if (!isConnected && !connectionError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <Card className="w-96 bg-gray-800 border-gray-700">
          <CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
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
  if (connectionError) {
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
              {connectionError}
            </p>
            <Button onClick={() => window.location.reload()} variant="outline">
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
        {/* En-tête */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  Vidéoconférence
                  {isHost && <Badge variant="secondary" className="bg-blue-600 text-white">Hôte</Badge>}
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
                  onClick={leaveRoom}
                >
                  <PhoneOff className="h-4 w-4 mr-2" />
                  Quitter
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Zone vidéo principale */}
        <div className="grid gap-4">
          {/* Vidéo locale */}
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-1 rounded text-sm">
                  {displayName} (Vous)
                  {isHost && <span className="ml-2 text-blue-400">• Hôte</span>}
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
                      <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-1 rounded text-sm">
                        {participant.name}
                        {participant.isHost && <span className="ml-2 text-blue-400">• Hôte</span>}
                      </div>
                      {!participant.stream && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
                          <div className="text-center text-white">
                            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <div className="text-sm opacity-75">Connexion...</div>
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

export default SimpleVideoConference; 