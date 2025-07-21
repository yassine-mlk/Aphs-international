import React, { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useRobustVideoConference } from '@/hooks/useRobustVideoConference';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Monitor, 
  MonitorOff,
  MessageSquare,
  PhoneOff,
  Users,
  Wifi,
  WifiOff,
  AlertCircle
} from 'lucide-react';

interface RobustVideoConferenceProps {
  roomId: string;
  userName: string;
  onLeave?: () => void;
  onError?: (error: string) => void;
}

export const RobustVideoConference: React.FC<RobustVideoConferenceProps> = ({
  roomId,
  userName,
  onLeave,
  onError
}) => {
  const { toast } = useToast();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideosRef = useRef<{ [key: string]: HTMLVideoElement }>({});
  const [isChatOpen, setIsChatOpen] = React.useState(false);
  const [chatMessage, setChatMessage] = React.useState('');

  const {
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
  } = useRobustVideoConference({
    roomId,
    userName,
    onError
  });

  // Attacher le stream local à la vidéo
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.muted = true;
      
      // Forcer la lecture de la vidéo
      localVideoRef.current.play().then(() => {
        console.log('✅ Local video playing successfully');
      }).catch(error => {
        console.warn('⚠️ Could not auto-play local video:', error);
      });
    }
  }, [localStream]);

  // Attacher les streams distants aux vidéos
  useEffect(() => {
    console.log('🔄 Attaching remote streams to videos...', participants);
    
    participants.forEach(participant => {
      const videoElement = remoteVideosRef.current[participant.id];
      
      console.log(`📹 Participant ${participant.id}:`, {
        hasStream: !!participant.stream,
        hasVideoElement: !!videoElement,
        streamActive: participant.stream?.active,
        streamId: participant.stream?.id,
        isConnected: participant.isConnected
      });
      
      if (participant.stream && videoElement) {
        // Vérifier si le stream est actif
        if (participant.stream.active) {
          console.log(`🎥 Attaching stream to video for ${participant.id}`);
          
          // Arrêter l'ancien stream s'il y en a un
          if (videoElement.srcObject) {
            console.log(`🔄 Replacing existing stream for ${participant.id}`);
          }
          
          videoElement.srcObject = participant.stream;
          videoElement.muted = false; // Permettre l'audio des autres participants
          
          // Forcer la lecture de la vidéo
          videoElement.play().then(() => {
            console.log(`✅ Remote video playing for ${participant.id}`);
          }).catch(error => {
            console.warn(`⚠️ Could not auto-play remote video for ${participant.id}:`, error);
          });
          
          console.log(`✅ Stream attached to video for ${participant.id}`);
        } else {
          console.warn(`⚠️ Stream not active for ${participant.id}`);
        }
      } else {
        console.log(`⚠️ Missing stream or video element for ${participant.id}:`, {
          hasStream: !!participant.stream,
          hasVideoElement: !!videoElement
        });
      }
    });
  }, [participants]);

  // Gérer les erreurs
  useEffect(() => {
    if (error) {
      toast({
        title: "Erreur de connexion",
        description: error,
        variant: "destructive"
      });
    }
  }, [error, toast]);

  // Gérer la déconnexion
  const handleLeave = () => {
    disconnect();
    onLeave?.();
  };

  // Envoyer un message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatMessage.trim()) {
      sendMessage(chatMessage);
      setChatMessage('');
    }
  };

  // Calculer la grille des participants
  const getGridClass = (participantCount: number) => {
    if (participantCount === 0) return 'grid-cols-1';
    if (participantCount === 1) return 'grid-cols-2';
    if (participantCount <= 2) return 'grid-cols-3';
    if (participantCount <= 4) return 'grid-cols-4';
    if (participantCount <= 6) return 'grid-cols-5';
    return 'grid-cols-6';
  };

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-white text-lg font-semibold">Vidéoconférence</h1>
          <Badge variant={isConnected ? "default" : "secondary"}>
            {isConnected ? (
              <>
                <Wifi className="w-3 h-3 mr-1" />
                Connecté
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 mr-1" />
                Déconnecté
              </>
            )}
          </Badge>
          <Badge variant="outline" className="text-white border-white">
            <Users className="w-3 h-3 mr-1" />
            {participants.length + 1} participant(s)
          </Badge>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="text-white border-white hover:bg-white hover:text-gray-900"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Chat
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleLeave}
          >
            <PhoneOff className="w-4 h-4 mr-2" />
            Quitter
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Video Grid */}
        <div className={`flex-1 p-4 grid ${getGridClass(participants.length)} gap-4`}>
          {/* Local Video */}
          <Card className="relative bg-gray-800 border-gray-700">
            <CardContent className="p-0 aspect-video relative">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover rounded-lg"
              />
              <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-white text-sm">
                {userName} (Vous)
              </div>
              
              {/* Indicateur de chargement de la caméra */}
              {connectionStatus === 'connecting' && !localStream && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-2"></div>
                    <p className="text-gray-400 text-sm">Accès à la caméra...</p>
                  </div>
                </div>
              )}
              
              {/* Indicateur vidéo désactivée */}
              {!isVideoEnabled && localStream && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                  <VideoOff className="w-12 h-12 text-gray-400" />
                </div>
              )}
              
              {/* Indicateur d'erreur de caméra */}
              {connectionStatus === 'error' && !localStream && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                  <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-2" />
                    <p className="text-red-400 text-sm">Erreur d'accès caméra</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Remote Videos */}
          {participants.map((participant) => (
            <Card key={participant.id} className="relative bg-gray-800 border-gray-700">
              <CardContent className="p-0 aspect-video relative">
                <video
                  ref={(el) => {
                    if (el) {
                      remoteVideosRef.current[participant.id] = el;
                      console.log(`📹 Video element created for ${participant.id}`);
                    }
                  }}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover rounded-lg"
                />
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 px-2 py-1 rounded text-white text-sm">
                  {participant.name}
                  {participant.isConnected ? (
                    <Wifi className="w-3 h-3 ml-1 inline" />
                  ) : (
                    <AlertCircle className="w-3 h-3 ml-1 inline text-yellow-400" />
                  )}
                </div>
                
                {/* Indicateur de chargement/connexion */}
                {(!participant.stream || !participant.stream.active) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                    <div className="text-center">
                      {participant.isConnected ? (
                        <>
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-2"></div>
                          <p className="text-gray-400 text-sm">Connexion en cours...</p>
                        </>
                      ) : (
                        <>
                          <VideoOff className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-400 text-sm">En attente...</p>
                        </>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Indicateur de problème de connexion */}
                {participant.stream && !participant.stream.active && participant.isConnected && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                    <div className="text-center">
                      <AlertCircle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                      <p className="text-yellow-400 text-sm">Problème de flux vidéo</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Chat Panel */}
        {isChatOpen && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-white font-semibold">Chat</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-lg ${
                    msg.from === userName
                      ? 'bg-blue-600 text-white ml-8'
                      : 'bg-gray-700 text-white mr-8'
                  }`}
                >
                  <div className="text-xs opacity-75 mb-1">
                    {msg.from} • {msg.timestamp.toLocaleTimeString()}
                  </div>
                  <div>{msg.message}</div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-700">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Tapez votre message..."
                  className="flex-1 px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-blue-500"
                />
                <Button type="submit" size="sm" disabled={!chatMessage.trim()}>
                  Envoyer
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-800 p-4 flex items-center justify-center space-x-4">
        <Button
          variant={isAudioEnabled ? "default" : "destructive"}
          size="lg"
          onClick={toggleAudio}
          className="rounded-full w-12 h-12 p-0"
        >
          {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </Button>

        <Button
          variant={isVideoEnabled ? "default" : "destructive"}
          size="lg"
          onClick={toggleVideo}
          className="rounded-full w-12 h-12 p-0"
        >
          {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </Button>

        <Button
          variant={isScreenSharing ? "destructive" : "outline"}
          size="lg"
          onClick={toggleScreenShare}
          className="rounded-full w-12 h-12 p-0"
        >
          {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
        </Button>

        <Button
          variant="destructive"
          size="lg"
          onClick={handleLeave}
          className="rounded-full w-12 h-12 p-0"
        >
          <PhoneOff className="w-5 h-5" />
        </Button>
      </div>

      {/* Connection Status */}
      {connectionStatus === 'connecting' && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Connexion en cours...</p>
          </div>
        </div>
      )}

      {connectionStatus === 'error' && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">Erreur de connexion</p>
            <Button onClick={() => window.location.reload()}>
              Réessayer
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}; 