import React, { useEffect, useRef, useState, useCallback } from 'react';
import SimplePeer from 'simple-peer';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
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
  Square
} from 'lucide-react';
import { useToast } from './ui/use-toast';
import { useSocket } from '../hooks/useSocket';
import { useRecording } from '../hooks/useRecording';
import { MeetingChat } from './MeetingChat';
import { useAuth } from '../contexts/AuthContext';

interface WebRTCMeetingProps {
  roomId: string;
  displayName: string;
  email?: string;
  onClose?: () => void;
  onError?: (error: Error) => void;
  isModerator?: boolean;
}

interface Participant {
  id: string;
  name: string;
  stream?: MediaStream;
  peer?: SimplePeer.Instance;
}

export function WebRTCMeeting({ 
  roomId, 
  displayName, 
  email, 
  onClose, 
  onError, 
  isModerator = false 
}: WebRTCMeetingProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Refs pour les éléments vidéo
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideosRef = useRef<{ [key: string]: HTMLVideoElement }>({});
  const peersRef = useRef<{ [key: string]: SimplePeer.Instance }>({});
  
  // États locaux
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // Hooks personnalisés
  const socket = useSocket({
    roomId,
    userName: displayName,
    userId: user?.id || 'anonymous'
  });
  
  const recording = useRecording(roomId);

  // Initialiser le stream local (caméra + micro)
  const initializeLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      setLocalStream(stream);
      
      // Afficher le stream local
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true; // Toujours muter sa propre vidéo pour éviter l'écho
      }
      
      setIsConnected(true);
      toast({
        title: "Connexion établie",
        description: "Votre caméra et microphone sont activés"
      });
      
    } catch (error) {
      console.error('Erreur accès média:', error);
      setConnectionError('Impossible d\'accéder à la caméra/microphone');
      if (onError) {
        onError(new Error('Accès refusé à la caméra/microphone'));
      }
    }
  }, [toast, onError]);

  // Créer une connexion peer avec un participant
  const createPeerConnection = useCallback((participantId: string, initiator: boolean = false) => {
    if (!localStream) return;

    const peer = new SimplePeer({
      initiator,
      trickle: false,
      stream: localStream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      }
    });

    peersRef.current[participantId] = peer;

    peer.on('signal', (signal) => {
      socket.sendSignal(signal, participantId);
    });

    peer.on('stream', (remoteStream) => {
      setParticipants(prev => prev.map(p => 
        p.id === participantId 
          ? { ...p, stream: remoteStream, peer }
          : p
      ));
      
      // Afficher le stream distant
      setTimeout(() => {
        const videoElement = remoteVideosRef.current[participantId];
        if (videoElement) {
          videoElement.srcObject = remoteStream;
        }
      }, 100);
    });

    peer.on('error', (error) => {
      console.error('Erreur peer:', error);
      toast({
        title: "Erreur de connexion",
        description: `Problème avec ${participantId}`,
        variant: "destructive"
      });
    });

    peer.on('close', () => {
      delete peersRef.current[participantId];
      setParticipants(prev => prev.filter(p => p.id !== participantId));
    });

    return peer;
  }, [localStream, socket, toast]);

  // Gérer les nouveaux participants
  useEffect(() => {
    if (!socket.isConnected || !localStream) return;

    // Créer des connexions pour les participants existants
    socket.participants.forEach(participantId => {
      if (!peersRef.current[participantId]) {
        const participant: Participant = {
          id: participantId,
          name: participantId
        };
        
        setParticipants(prev => {
          if (!prev.find(p => p.id === participantId)) {
            return [...prev, participant];
          }
          return prev;
        });
        
        createPeerConnection(participantId, true);
      }
    });
  }, [socket.participants, socket.isConnected, localStream, createPeerConnection]);

  // Gérer les signaux WebRTC
  useEffect(() => {
    const cleanup = socket.onSignal((data) => {
      const { signal, from } = data;
      
      let peer = peersRef.current[from];
      if (!peer) {
        // Créer une nouvelle connexion
        peer = createPeerConnection(from, false);
        
        // Ajouter le participant s'il n'existe pas
        setParticipants(prev => {
          if (!prev.find(p => p.id === from)) {
            return [...prev, { id: from, name: from }];
          }
          return prev;
        });
      }
      
      if (peer) {
        peer.signal(signal);
      }
    });

    return () => {
      if (typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, [socket, createPeerConnection]);

  // Initialiser la réunion au montage
  useEffect(() => {
    initializeLocalStream();
    
    return () => {
      // Nettoyer à la fermeture
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      
      // Fermer toutes les connexions peer
      Object.values(peersRef.current).forEach(peer => {
        peer.destroy();
      });
    };
  }, [initializeLocalStream]);

  // Contrôles média
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
        
        const videoTrack = screenStream.getVideoTracks()[0];
        if (localStream && videoTrack) {
          const currentVideoTrack = localStream.getVideoTracks()[0];
          if (currentVideoTrack) {
            localStream.removeTrack(currentVideoTrack);
            currentVideoTrack.stop();
          }
          localStream.addTrack(videoTrack);
          
          setIsScreenSharing(true);
          
          // Arrêter le partage quand l'utilisateur clique stop
          videoTrack.onended = () => {
            setIsScreenSharing(false);
            // Revenir à la caméra
            navigator.mediaDevices.getUserMedia({ video: true })
              .then(cameraStream => {
                const newVideoTrack = cameraStream.getVideoTracks()[0];
                if (localStream && newVideoTrack) {
                  localStream.removeTrack(videoTrack);
                  localStream.addTrack(newVideoTrack);
                }
              });
          };
        }
      } else {
        setIsScreenSharing(false);
      }
    } catch (error) {
      console.error('Erreur partage d\'écran:', error);
      toast({
        title: "Erreur",
        description: "Impossible de partager l'écran",
        variant: "destructive"
      });
    }
  }, [isScreenSharing, localStream, toast]);

  const copyRoomId = useCallback(() => {
    navigator.clipboard.writeText(roomId);
    toast({
      title: "Copié",
      description: "ID de réunion copié dans le presse-papier"
    });
  }, [roomId, toast]);

  const startRecording = useCallback(async () => {
    if (localStream) {
      await recording.startRecording(localStream);
    }
  }, [localStream, recording]);

  const stopRecording = useCallback(async () => {
    const recordingUrl = await recording.stopRecording();
    if (recordingUrl) {
      toast({
        title: "Enregistrement sauvegardé",
        description: "L'enregistrement est disponible dans vos fichiers"
      });
    }
  }, [recording, toast]);

  const endCall = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    
    // Arrêter l'enregistrement si en cours
    if (recording.isRecording) {
      recording.stopRecording();
    }
    
    if (onClose) onClose();
  }, [localStream, recording, onClose]);

  if (connectionError) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center bg-red-50 rounded-lg border border-red-200 h-[600px]">
        <h3 className="text-xl font-semibold text-red-700 mb-4">
          Erreur de connexion
        </h3>
        <p className="text-red-600 mb-6">{connectionError}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full h-[600px] bg-gray-900 rounded-lg overflow-hidden relative">
      {/* En-tête de la réunion */}
      <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-center">
        <Card className="bg-white/90 backdrop-blur-sm">
          <CardContent className="p-2 flex items-center space-x-2">
            <Badge variant="outline" className="bg-green-100 text-green-800">
              <Users className="w-3 h-3 mr-1" />
              {participants.length + 1}
            </Badge>
            <span className="text-sm font-medium">{roomId}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyRoomId}
              className="h-6 w-6 p-0"
            >
              <Copy className="w-3 h-3" />
            </Button>
          </CardContent>
        </Card>
        
        {isModerator && (
          <Badge className="bg-blue-100 text-blue-800">
            Modérateur
          </Badge>
        )}
      </div>

      {/* Grille des vidéos */}
      <div className={`grid h-full gap-2 p-4 pt-16 ${
        participants.length === 0 ? 'grid-cols-1' :
        participants.length <= 1 ? 'grid-cols-2' :
        participants.length <= 3 ? 'grid-cols-2 grid-rows-2' :
        'grid-cols-3 grid-rows-2'
      }`}>
        {/* Vidéo locale */}
        <div className="relative bg-gray-800 rounded-lg overflow-hidden">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-sm">
            Vous {!isVideoEnabled && "(caméra off)"}
          </div>
          {recording.isRecording && (
            <div className="absolute top-2 left-2 flex items-center bg-red-600 text-white px-2 py-1 rounded text-xs">
              <Circle className="w-2 h-2 mr-1 fill-current animate-pulse" />
              REC {recording.formatDuration(recording.recordingDuration)}
            </div>
          )}
        </div>

        {/* Vidéos des participants */}
        {participants.map((participant) => (
          <div key={participant.id} className="relative bg-gray-800 rounded-lg overflow-hidden">
            <video
              ref={(el) => {
                if (el) remoteVideosRef.current[participant.id] = el;
              }}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-sm">
              {participant.name}
            </div>
            {!participant.stream && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
                <div className="text-white text-center">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <div className="text-sm opacity-75">Connexion...</div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Contrôles */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
        <div className="flex items-center space-x-2 bg-black/70 backdrop-blur-sm rounded-full p-2">
          <Button
            variant={isAudioEnabled ? "default" : "destructive"}
            size="sm"
            onClick={toggleAudio}
            className="rounded-full w-10 h-10 p-0"
            title={isAudioEnabled ? "Couper le micro" : "Activer le micro"}
          >
            {isAudioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </Button>
          
          <Button
            variant={isVideoEnabled ? "default" : "destructive"}
            size="sm"
            onClick={toggleVideo}
            className="rounded-full w-10 h-10 p-0"
            title={isVideoEnabled ? "Couper la caméra" : "Activer la caméra"}
          >
            {isVideoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
          </Button>
          
          <Button
            variant={isScreenSharing ? "secondary" : "outline"}
            size="sm"
            onClick={toggleScreenShare}
            className="rounded-full w-10 h-10 p-0"
            title={isScreenSharing ? "Arrêter le partage" : "Partager l'écran"}
          >
            {isScreenSharing ? <MonitorOff className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
          </Button>
          
          {isModerator && (
            <Button
              variant={recording.isRecording ? "destructive" : "outline"}
              size="sm"
              onClick={recording.isRecording ? stopRecording : startRecording}
              className="rounded-full w-10 h-10 p-0"
              title={recording.isRecording ? "Arrêter l'enregistrement" : "Démarrer l'enregistrement"}
            >
              {recording.isRecording ? <Square className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
            </Button>
          )}
          
          <Button
            variant="destructive"
            size="sm"
            onClick={endCall}
            className="rounded-full w-10 h-10 p-0"
            title="Quitter la réunion"
          >
            <PhoneOff className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Chat intégré */}
      <MeetingChat
        messages={socket.messages}
        onSendMessage={socket.sendChatMessage}
        isOpen={isChatOpen}
        onToggle={() => setIsChatOpen(!isChatOpen)}
        participantCount={socket.participants.length + 1}
      />
    </div>
  );
} 