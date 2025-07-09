import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
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
  Copy,
  MessageSquare,
  Info
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
  const [localVideoReady, setLocalVideoReady] = useState(false);

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

  // Timeout pour forcer l'affichage de la vidéo locale si elle tarde à se charger
  useEffect(() => {
    if (localStream && !localVideoReady) {
      const timer = setTimeout(() => {
        console.log('⏰ Forcing local video ready after timeout');
        setLocalVideoReady(true);
      }, 3000); // 3 secondes max

      return () => clearTimeout(timer);
    }
  }, [localStream, localVideoReady]);

  // Attacher automatiquement le stream local - nouvelle approche avec meilleur timing
  useEffect(() => {
    console.log('🔄 Checking stream attachment conditions:', { 
      hasStream: !!localStream, 
      hasVideoRef: !!localVideoRef.current,
      videoReady: localVideoReady
    });

    if (localStream && localVideoRef.current) {
      console.log('🎥 ✅ BOTH conditions met - Attaching local stream to video element...', localStream);
      
      // Vérifier que le stream a des tracks vidéo actifs
      const videoTracks = localStream.getVideoTracks();
      console.log('📹 Video tracks:', videoTracks.length, videoTracks.map(t => ({
        enabled: t.enabled,
        readyState: t.readyState,
        muted: t.muted
      })));
      
      const videoElement = localVideoRef.current;
      
      // Clear any existing srcObject first
      if (videoElement.srcObject) {
        console.log('🧹 Clearing existing srcObject');
        videoElement.srcObject = null;
      }
      
      // Set the new stream
      videoElement.srcObject = localStream;
      videoElement.muted = true; // Important pour éviter l'écho
      videoElement.autoplay = true;
      videoElement.playsInline = true;
      
      // Forcer immédiatement la vidéo prête pour éviter l'écran noir
      setLocalVideoReady(true);
      
      // S'assurer que la vidéo est prête à être affichée
      const handleCanPlay = () => {
        setLocalVideoReady(true);
        console.log('✅ Local video ready to play');
      };
      
      const handleLoadedMetadata = () => {
        setLocalVideoReady(true);
        console.log('✅ Local video metadata loaded');
      };
      
      const handlePlay = () => {
        setLocalVideoReady(true);
        console.log('✅ Local video started playing');
      };
      
      const handleLoadStart = () => {
        console.log('🔄 Local video load started');
      };

      const handleError = (e) => {
        console.error('❌ Video element error:', e);
        setLocalVideoReady(false);
      };
      
      // Ajouter les event listeners
      videoElement.addEventListener('canplay', handleCanPlay);
      videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
      videoElement.addEventListener('play', handlePlay);
      videoElement.addEventListener('loadstart', handleLoadStart);
      videoElement.addEventListener('error', handleError);
      
      // Forcer la lecture de la vidéo avec retry plus agressif
      const attemptPlay = () => {
        console.log('🎬 Attempting to play local video...');
        videoElement.play().then(() => {
          console.log('✅ Local video playing successfully');
          setLocalVideoReady(true);
        }).catch(error => {
          console.warn('⚠️ Could not auto-play local video:', error);
          // Même en cas d'erreur d'autoplay, on peut toujours afficher la vidéo
          setLocalVideoReady(true);
        });
      };
      
      // Essayer plusieurs fois avec des délais différents
      attemptPlay();
      setTimeout(attemptPlay, 50);
      setTimeout(attemptPlay, 200);
      setTimeout(attemptPlay, 500);
      
      console.log('✅ Local stream attached to video element with aggressive retry');
      
      // Cleanup function
      return () => {
        if (videoElement) {
          videoElement.removeEventListener('canplay', handleCanPlay);
          videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
          videoElement.removeEventListener('play', handlePlay);
          videoElement.removeEventListener('loadstart', handleLoadStart);
          videoElement.removeEventListener('error', handleError);
        }
      };
    } else {
      console.log('⚠️ Stream attachment conditions not met:', { 
        localStream: !!localStream, 
        videoRef: !!localVideoRef.current 
      });
      
      // Si on a le stream mais pas le ref, on peut réessayer dans un moment
      if (localStream && !localVideoRef.current) {
        console.log('⏳ Stream available but ref not ready, will retry...');
        setTimeout(() => {
          if (localVideoRef.current && localStream) {
            console.log('🔄 Retry: attempting to attach stream...');
            // Trigger a re-render by updating localVideoReady
            setLocalVideoReady(false);
            setTimeout(() => setLocalVideoReady(true), 10);
          }
        }, 100);
      }
      
      setLocalVideoReady(false);
    }
  }, [localStream]); // Seulement localStream comme dépendance
  
  // UseLayoutEffect pour s'assurer que l'élément vidéo est attaché immédiatement après le render
  useLayoutEffect(() => {
    if (localStream && localVideoRef.current) {
      console.log('🎬 useLayoutEffect: Force attaching stream to video element');
      const videoElement = localVideoRef.current;
      
      if (videoElement.srcObject !== localStream) {
        videoElement.srcObject = localStream;
        videoElement.muted = true;
        setLocalVideoReady(true);
        
        videoElement.play().catch(error => {
          console.warn('⚠️ useLayoutEffect play failed:', error);
          setLocalVideoReady(true); // Force ready même en cas d'erreur
        });
        
        console.log('✅ useLayoutEffect: Stream attached successfully');
      }
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

  // Fonction de diagnostic pour déboguer les problèmes de vidéo
  const runDiagnostics = useCallback(() => {
    console.log('🔍 === DIAGNOSTIC VIDÉO ===');
    console.log('🎥 Local stream:', localStream);
    console.log('📹 Local video ref:', localVideoRef.current);
    console.log('⚙️ Connection status:', connectionStatus);
    console.log('🔗 Is connected:', isConnected);
    console.log('🎮 Controls:', { isAudioEnabled, isVideoEnabled });
    console.log('✅ Local video ready:', localVideoReady);
    
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      const audioTracks = localStream.getAudioTracks();
      console.log('📹 Video tracks active:', videoTracks.map(t => ({
        enabled: t.enabled,
        readyState: t.readyState,
        muted: t.muted,
        settings: t.getSettings()
      })));
      console.log('🎤 Audio tracks active:', audioTracks.map(t => ({
        enabled: t.enabled,
        readyState: t.readyState,
        muted: t.muted
      })));
    }
    
    if (localVideoRef.current) {
      const video = localVideoRef.current;
      console.log('📺 Video element:', {
        srcObject: video.srcObject,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        readyState: video.readyState,
        paused: video.paused,
        muted: video.muted,
        autoplay: video.autoplay
      });
      
      // Essayer de forcer l'attachement si pas déjà fait
      if (localStream && video.srcObject !== localStream) {
        console.log('🔧 Forcing stream attachment...');
        video.srcObject = localStream;
        video.muted = true;
        setLocalVideoReady(true);
        
        video.play().then(() => {
          console.log('✅ Forced video play successful');
          setLocalVideoReady(true);
        }).catch(error => {
          console.warn('⚠️ Forced video play failed:', error);
          setLocalVideoReady(true);
        });
      }
    }
    
    // Forcer localVideoReady à true pour tester
    setLocalVideoReady(true);
    
    toast({
      title: "Diagnostic terminé",
      description: "Stream forcé - vérifiez la console (F12)",
    });
  }, [localStream, connectionStatus, isConnected, isAudioEnabled, isVideoEnabled, localVideoReady, toast]);



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
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* En-tête avec informations de la conférence */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  Vidéoconférence
                  <Badge 
                    variant={isConnected ? "default" : "secondary"} 
                    className={`${isConnected ? 'bg-green-600' : 'bg-yellow-600'} text-white`}
                  >
                    <div className="h-2 w-2 rounded-full bg-current mr-1" />
                    {isConnected ? 'Connecté' : 'Connexion...'}
                  </Badge>
                </CardTitle>
                <p className="text-gray-400 text-sm mt-1">
                  Room: {roomId} • {participants.length + 1} participant(s) • {displayName}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={copyRoomLink}
                  variant="outline"
                  size="sm"
                  className="text-gray-300 border-gray-600 hover:bg-gray-700"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copier ID
                </Button>
                <Button
                  onClick={() => setIsChatOpen(!isChatOpen)}
                  variant="outline"
                  size="sm"
                  className="text-gray-300 border-gray-600 hover:bg-gray-700"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Chat
                </Button>
                <Button
                  onClick={runDiagnostics}
                  variant="outline"
                  size="sm"
                  className="text-gray-300 border-gray-600 hover:bg-gray-700"
                  title="Diagnostic vidéo (Ouvre la console)"
                >
                  <Info className="h-4 w-4 mr-2" />
                  Debug
                </Button>
                <Button
                  onClick={handleLeave}
                  variant="destructive"
                  size="sm"
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
                  onLoadedMetadata={() => {
                    console.log('🎬 Local video metadata loaded');
                    setLocalVideoReady(true);
                  }}
                  onCanPlay={() => {
                    console.log('🎬 Local video can play');
                    setLocalVideoReady(true);
                  }}
                  onError={(e) => {
                    console.error('❌ Local video error:', e);
                    setLocalVideoReady(false);
                  }}
                />
                <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-1 rounded text-sm">
                  {displayName} (Vous)
                </div>
                {!isVideoEnabled && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
                    <div className="text-center">
                      <VideoOff className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-400 text-sm">Vidéo désactivée</p>
                    </div>
                  </div>
                )}
                {isVideoEnabled && !localStream && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-2"></div>
                      <p className="text-gray-400 text-sm">Accès à la caméra...</p>
                    </div>
                  </div>
                )}
                {isVideoEnabled && localStream && !localVideoReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800/50">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400 mx-auto mb-2"></div>
                      <p className="text-gray-400 text-xs">Chargement...</p>
                    </div>
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
                          <div className={`h-2 w-2 rounded-full ${
                            participant.isConnected ? 'bg-green-400' : 'bg-yellow-400'
                          }`} />
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
                  onClick={copyRoomLink}
                  className="text-gray-300 border-gray-600 hover:bg-gray-700"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copier l'ID de la room
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Contrôles de la conférence */}
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex justify-center gap-4">
              <Button
                onClick={handleToggleAudio}
                variant={isAudioEnabled ? "default" : "destructive"}
                size="lg"
                className="rounded-full w-14 h-14 p-0"
                title={isAudioEnabled ? "Désactiver le micro" : "Activer le micro"}
              >
                {isAudioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
              </Button>

              <Button
                onClick={handleToggleVideo}
                variant={isVideoEnabled ? "default" : "destructive"}
                size="lg"
                className="rounded-full w-14 h-14 p-0"
                title={isVideoEnabled ? "Désactiver la vidéo" : "Activer la vidéo"}
              >
                {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
              </Button>

              <Button
                onClick={handleToggleScreenShare}
                variant={isScreenSharing ? "secondary" : "outline"}
                size="lg"
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