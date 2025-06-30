import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  Users,
  Settings,
  Copy,
  MessageSquare
} from 'lucide-react';
import { useToast } from './ui/use-toast';
import { useAuth } from '../contexts/AuthContext';
import { useSimplePeerVideoConference } from '../hooks/useSimplePeerVideoConference';
import { VideoConferenceChat } from './VideoConferenceChat';

interface EnhancedVideoConferenceProps {
  roomId: string;
  userName?: string;
  onLeave?: () => void;
  onError?: (error: Error) => void;
}

export const EnhancedVideoConference: React.FC<EnhancedVideoConferenceProps> = ({
  roomId,
  userName,
  onLeave,
  onError
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Refs pour les éléments vidéo
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideosRef = useRef<{ [key: string]: HTMLVideoElement }>({});
  
  // States pour les contrôles
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // Hook de vidéoconférence
  const {
    localStream,
    participants,
    isConnected,
    connectionStatus,
    error,
    disconnectFromRoom,
    toggleAudio,
    toggleVideo,
    attachLocalStream,
    currentUserId,
    displayName
  } = useSimplePeerVideoConference({
    roomId,
    userName,
    onError
  });

  // Attacher automatiquement le stream local quand il est disponible
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
      console.log('📺 Local stream attached to video element');
    }
  }, [localStream]);

  // Attacher les streams distants aux éléments vidéo
  useEffect(() => {
    participants.forEach(participant => {
      if (participant.stream && remoteVideosRef.current[participant.id]) {
        const videoElement = remoteVideosRef.current[participant.id];
        if (videoElement.srcObject !== participant.stream) {
          videoElement.srcObject = participant.stream;
          console.log(`📺 Remote stream attached for ${participant.name}`);
        }
      }
    });
  }, [participants]);

  // Gérer les contrôles audio/vidéo
  const handleToggleAudio = useCallback(() => {
    const enabled = toggleAudio();
    setIsAudioEnabled(enabled);
    toast({
      title: enabled ? "Microphone activé" : "Microphone désactivé",
      description: enabled ? "Votre voix est maintenant audible" : "Votre voix est coupée",
    });
  }, [toggleAudio, toast]);

  const handleToggleVideo = useCallback(() => {
    const enabled = toggleVideo();
    setIsVideoEnabled(enabled);
    toast({
      title: enabled ? "Caméra activée" : "Caméra désactivée",
      description: enabled ? "Votre vidéo est maintenant visible" : "Votre vidéo est coupée",
    });
  }, [toggleVideo, toast]);

  // Partage d'écran
  const handleToggleScreenShare = useCallback(async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        // TODO: Implémenter le remplacement de track
        setIsScreenSharing(true);
        toast({
          title: "Partage d'écran activé",
          description: "Votre écran est maintenant partagé",
        });

        // Écouter la fin du partage d'écran
        screenStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          toast({
            title: "Partage d'écran arrêté",
            description: "Le partage d'écran a été interrompu",
          });
        };
      } catch (error) {
        console.error('❌ Screen share error:', error);
        toast({
          title: "Erreur de partage d'écran",
          description: "Impossible de partager l'écran",
          variant: "destructive"
        });
      }
    } else {
      setIsScreenSharing(false);
      // TODO: Implémenter l'arrêt du partage d'écran
    }
  }, [isScreenSharing, toast]);

  // Quitter la conférence
  const handleLeave = useCallback(async () => {
    try {
      await disconnectFromRoom();
      toast({
        title: "Conférence terminée",
        description: "Vous avez quitté la conférence",
      });
      onLeave?.();
    } catch (error) {
      console.error('❌ Error leaving conference:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la déconnexion",
        variant: "destructive"
      });
    }
  }, [disconnectFromRoom, onLeave, toast]);

  // Copier le lien de la room
  const copyRoomLink = useCallback(() => {
    const roomUrl = `${window.location.origin}/video-conference/${roomId}`;
    navigator.clipboard.writeText(roomUrl);
    toast({
      title: "Lien copié",
      description: "Le lien de la conférence a été copié dans le presse-papiers",
    });
  }, [roomId, toast]);

  // Masquer/afficher les contrôles automatiquement
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(timeout);
    };
  }, []);

  // Afficher les erreurs
  useEffect(() => {
    if (error) {
      toast({
        title: "Erreur de connexion",
        description: error,
        variant: "destructive"
      });
    }
  }, [error, toast]);

  if (connectionStatus === 'connecting') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="bg-gray-800 border-gray-700 p-8">
          <CardContent className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-white text-lg">Connexion à la conférence...</p>
            <p className="text-gray-400 text-sm mt-2">Initialisation de votre caméra et microphone</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (connectionStatus === 'error') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="bg-gray-800 border-gray-700 p-8 max-w-md">
          <CardContent className="text-center">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h2 className="text-white text-xl font-bold mb-2">Erreur de connexion</h2>
            <p className="text-gray-400 text-sm mb-6">{error || 'Impossible de se connecter à la conférence'}</p>
            <div className="space-y-2">
              <Button onClick={() => window.location.reload()} className="w-full">
                Réessayer
              </Button>
              <Button onClick={onLeave} variant="outline" className="w-full">
                Retour
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 relative overflow-hidden">
      {/* Header avec informations de la conférence */}
      <div className={`absolute top-0 left-0 right-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity duration-300 ${
        showControls ? 'opacity-100' : 'opacity-0'
      }`}>
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <h1 className="text-white text-lg font-semibold">
              Conférence {roomId}
            </h1>
            <Badge 
              variant={isConnected ? "default" : "secondary"}
              className={`${isConnected ? 'bg-green-600' : 'bg-yellow-600'} text-white`}
            >
              {isConnected ? 'Connecté' : 'Connexion...'}
            </Badge>
            <div className="flex items-center gap-2 text-white/80 text-sm">
              <Users className="h-4 w-4" />
              {participants.length + 1} participant{participants.length > 0 ? 's' : ''}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={copyRoomLink}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => setIsChatOpen(!isChatOpen)}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Grille de vidéos */}
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
            {displayName} (Vous)
            {!isVideoEnabled && " (caméra off)"}
          </div>
          {!isVideoEnabled && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
              <VideoOff className="h-12 w-12 text-gray-400" />
            </div>
          )}
          {isScreenSharing && (
            <div className="absolute top-2 left-2 bg-green-600 text-white px-2 py-1 rounded text-xs">
              Partage d'écran
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
            <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-sm flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${
                participant.isConnected ? 'bg-green-400' : 'bg-yellow-400'
              }`} />
              {participant.name}
            </div>
            {!participant.stream && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
                <div className="text-white text-center">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <div className="text-sm opacity-75">
                    {participant.isConnected ? 'Connexion...' : 'En attente...'}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Contrôles de la conférence */}
      <div className={`absolute bottom-0 left-0 right-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity duration-300 ${
        showControls ? 'opacity-100' : 'opacity-0'
      }`}>
        <div className="flex items-center justify-center gap-4 p-4">
          <Button
            onClick={handleToggleAudio}
            variant={isAudioEnabled ? "default" : "destructive"}
            size="lg"
            className="rounded-full h-12 w-12"
          >
            {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </Button>

          <Button
            onClick={handleToggleVideo}
            variant={isVideoEnabled ? "default" : "destructive"}
            size="lg"
            className="rounded-full h-12 w-12"
          >
            {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </Button>

          <Button
            onClick={handleToggleScreenShare}
            variant={isScreenSharing ? "default" : "outline"}
            size="lg"
            className="rounded-full h-12 w-12"
          >
            {isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
          </Button>

          <div className="h-8 w-px bg-white/20" />

          <Button
            onClick={handleLeave}
            variant="destructive"
            size="lg"
            className="rounded-full h-12 w-12 bg-red-600 hover:bg-red-700"
          >
            <PhoneOff className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Chat intégré */}
      <VideoConferenceChat
        roomId={roomId}
        currentUserId={currentUserId}
        displayName={displayName}
        isOpen={isChatOpen}
        onToggle={() => setIsChatOpen(!isChatOpen)}
      />
    </div>
  );
}; 