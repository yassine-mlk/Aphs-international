import React, { useRef, useEffect, useState } from 'react';
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
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useToast } from './ui/use-toast';
import { useSimplePeerVideoConference } from '../hooks/useSimplePeerVideoConference';

interface OptimizedVideoCallProps {
  roomId: string;
  userName?: string;
  onLeave?: () => void;
}

const OptimizedVideoCall: React.FC<OptimizedVideoCallProps> = ({
  roomId,
  userName,
  onLeave
}) => {
  const { toast } = useToast();
  
  // Local state pour les contrôles UI
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  // Refs pour les éléments vidéo
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideosRef = useRef<{ [key: string]: HTMLVideoElement }>({});
  
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
    replaceVideoTrack,
    displayName
  } = useSimplePeerVideoConference({
    roomId,
    userName,
    onError: (error) => {
      toast({
        title: "Erreur vidéoconférence",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Attacher le stream local à l'élément vidéo
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.muted = true;
      
      // Forcer la lecture de la vidéo
      localVideoRef.current.play().then(() => {
      }).catch(error => {
      });
      
    } else {
        localStream: !!localStream, 
        videoRef: !!localVideoRef.current 
      });
    }
  }, [localStream]);

  // Attacher les streams distants aux éléments vidéo
  useEffect(() => {
    participants.forEach(participant => {
      if (participant.stream) {
        const videoElement = remoteVideosRef.current[participant.id];
        if (videoElement && videoElement.srcObject !== participant.stream) {
          videoElement.srcObject = participant.stream;
        }
      }
    });
  }, [participants]);

  // Contrôles média avec feedback UI
  const handleToggleAudio = () => {
    const newState = toggleAudio();
    setIsAudioEnabled(newState);
    toast({
      title: newState ? "Micro activé" : "Micro désactivé",
      description: newState ? "Votre micro est maintenant activé" : "Votre micro est maintenant désactivé",
    });
  };

  const handleToggleVideo = () => {
    const newState = toggleVideo();
    setIsVideoEnabled(newState);
    toast({
      title: newState ? "Vidéo activée" : "Vidéo désactivée",
      description: newState ? "Votre vidéo est maintenant activée" : "Votre vidéo est maintenant désactivée",
    });
  };

  const handleToggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        // Revenir à la caméra
        const cameraStream = await navigator.mediaDevices.getUserMedia({
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
        
        const success = await replaceVideoTrack(cameraStream);
        if (success) {
          setIsScreenSharing(false);
          toast({
            title: "Partage d'écran arrêté",
            description: "Retour à la caméra"
          });
        }
      } else {
        // Partager l'écran
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        const success = await replaceVideoTrack(screenStream);
        if (success) {
          setIsScreenSharing(true);
          toast({
            title: "Partage d'écran démarré",
            description: "Votre écran est maintenant partagé"
          });
          
          // Écouter la fin du partage d'écran
          screenStream.getVideoTracks()[0].onended = () => {
            setIsScreenSharing(false);
            handleToggleScreenShare(); // Revenir à la caméra
          };
        }
      }
    } catch (error) {
      toast({
        title: "Erreur partage d'écran",
        description: "Impossible de partager l'écran",
        variant: "destructive"
      });
    }
  };

  const handleLeaveRoom = async () => {
    await disconnectFromRoom();
    if (onLeave) {
      onLeave();
    }
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    toast({
      title: "ID de room copié",
      description: `${roomId} copié dans le presse-papiers`,
    });
  };

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
            <div className="mt-4 text-sm text-gray-500">
              Room: {roomId}
            </div>
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
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">
              Erreur de connexion
            </h3>
            <p className="text-gray-400 mb-4">
              {error || 'Une erreur est survenue lors de la connexion'}
            </p>
            <div className="flex gap-2 justify-center">
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline"
                className="text-gray-300 border-gray-600 hover:bg-gray-700"
              >
                Réessayer
              </Button>
              <Button 
                onClick={handleLeaveRoom}
                variant="secondary"
              >
                Retour
              </Button>
            </div>
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
                  Vidéoconférence Optimisée
                  <Badge 
                    variant={isConnected ? "default" : "secondary"} 
                    className={`${isConnected ? 'bg-green-600' : 'bg-yellow-600'} text-white`}
                  >
                    <Circle className="h-2 w-2 mr-1 fill-current" />
                    {isConnected ? 'Connecté' : 'Connexion...'}
                  </Badge>
                </CardTitle>
                <p className="text-gray-400 text-sm mt-1">
                  Room: {roomId} • {participants.length + 1} participant(s) • {displayName}
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
                  onClick={handleLeaveRoom}
                >
                  <PhoneOff className="h-4 w-4 mr-2" />
                  Quitter
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Zone vidéo */}
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
                  style={{ transform: 'scaleX(-1)' }} // Effet miroir pour la vidéo locale
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
                    🖥️ Partage d'écran
                  </div>
                )}
                <div className="absolute top-4 right-4 flex gap-1">
                  <div className={`w-2 h-2 rounded-full ${isAudioEnabled ? 'bg-green-400' : 'bg-red-400'}`} />
                  <div className={`w-2 h-2 rounded-full ${isVideoEnabled ? 'bg-green-400' : 'bg-red-400'}`} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Participants */}
          {participants.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-white text-lg font-medium flex items-center gap-2">
                <Users className="h-5 w-5" />
                Participants ({participants.length})
              </h3>
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
                                {participant.isConnected ? 'Chargement vidéo...' : 'Connexion...'}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Message si aucun participant */}
          {participants.length === 0 && isConnected && (
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-white text-lg font-medium mb-2">
                  En attente de participants
                </h3>
                <p className="text-gray-400 mb-4">
                  Partagez l'ID de la room avec d'autres personnes pour les inviter à rejoindre la vidéoconférence.
                </p>
                <Button
                  variant="outline"
                  onClick={copyRoomId}
                  className="text-gray-300 border-gray-600 hover:bg-gray-700"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copier l'ID de la room
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Contrôles */}
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex justify-center gap-4">
              <Button
                variant={isAudioEnabled ? "default" : "destructive"}
                size="lg"
                onClick={handleToggleAudio}
                className="rounded-full w-14 h-14 p-0"
                title={isAudioEnabled ? "Désactiver le micro" : "Activer le micro"}
              >
                {isAudioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
              </Button>

              <Button
                variant={isVideoEnabled ? "default" : "destructive"}
                size="lg"
                onClick={handleToggleVideo}
                className="rounded-full w-14 h-14 p-0"
                title={isVideoEnabled ? "Désactiver la vidéo" : "Activer la vidéo"}
              >
                {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
              </Button>

              <Button
                variant={isScreenSharing ? "secondary" : "outline"}
                size="lg"
                onClick={handleToggleScreenShare}
                className="rounded-full w-14 h-14 p-0"
                title={isScreenSharing ? "Arrêter le partage" : "Partager l'écran"}
              >
                {isScreenSharing ? <MonitorOff className="w-6 h-6" /> : <Monitor className="w-6 h-6" />}
              </Button>
            </div>
            
            {/* Indicateurs de statut */}
            <div className="flex justify-center gap-6 mt-4 text-sm">
              <div className="flex items-center gap-2 text-gray-400">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
                {isConnected ? 'Connecté' : 'Déconnecté'}
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <div className={`w-2 h-2 rounded-full ${isAudioEnabled ? 'bg-green-400' : 'bg-red-400'}`} />
                Audio {isAudioEnabled ? 'ON' : 'OFF'}
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <div className={`w-2 h-2 rounded-full ${isVideoEnabled ? 'bg-green-400' : 'bg-red-400'}`} />
                Vidéo {isVideoEnabled ? 'ON' : 'OFF'}
              </div>
              {isScreenSharing && (
                <div className="flex items-center gap-2 text-green-400">
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                  Partage d'écran actif
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OptimizedVideoCall; 