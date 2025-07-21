import React, { useRef, useEffect } from 'react';
import { useWebSocketVideoConference } from '@/hooks/useWebSocketVideoConference';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Monitor, 
  Phone, 
  Send,
  Users,
  MessageCircle
} from 'lucide-react';

interface SimpleVideoConferenceProps {
  roomId: string;
  userName: string;
  onError?: (error: string) => void;
}

export function SimpleVideoConference({ 
  roomId, 
  userName, 
  onError 
}: SimpleVideoConferenceProps) {
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
  } = useWebSocketVideoConference({ roomId, userName, onError });

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [chatMessage, setChatMessage] = React.useState('');
  const [showChat, setShowChat] = React.useState(false);

  // Attacher le stream local à la vidéo
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      
      // Gestion robuste de la lecture vidéo
      const playVideo = async () => {
        try {
          await localVideoRef.current?.play();
        } catch (err) {
          console.warn('⚠️ Erreur lecture vidéo locale (peut être normal):', err);
          // Ne pas afficher d'erreur pour les AbortError (normales lors du démontage)
          if (err instanceof Error && err.name !== 'AbortError') {
            console.error('❌ Erreur lecture vidéo locale:', err);
          }
        }
      };
      
      playVideo();
    }
  }, [localStream]);

  // Envoyer un message de chat
  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      sendMessage(chatMessage.trim());
      setChatMessage('');
    }
  };

  // Gérer la touche Entrée pour envoyer un message
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold">Vidéoconférence</h1>
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>{participants.length + 1} participant(s)</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className={`px-2 py-1 rounded text-xs ${
            connectionStatus === 'connected' ? 'bg-green-600' :
            connectionStatus === 'connecting' ? 'bg-yellow-600' :
            connectionStatus === 'error' ? 'bg-red-600' : 'bg-gray-600'
          }`}>
            {connectionStatus === 'connected' ? 'Connecté' :
             connectionStatus === 'connecting' ? 'Connexion...' :
             connectionStatus === 'error' ? 'Erreur' : 'Déconnecté'}
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="flex flex-1 overflow-hidden">
        {/* Zone vidéo */}
        <div className="flex-1 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full">
            {/* Vidéo locale */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Vous ({userName})</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <div className="relative aspect-video bg-gray-900 rounded overflow-hidden">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  {!isVideoEnabled && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                      <VideoOff className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Vidéos des participants */}
            {participants.map((participant) => (
              <Card key={participant.id} className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{participant.name}</CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  <div className="relative aspect-video bg-gray-900 rounded overflow-hidden">
                    {participant.stream ? (
                      <video
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                        onLoadedMetadata={(e) => {
                          const video = e.target as HTMLVideoElement;
                          video.play().catch(err => 
                            console.error('❌ Erreur lecture vidéo participant:', err)
                          );
                        }}
                        ref={(el) => {
                          if (el && participant.stream) {
                            el.srcObject = participant.stream;
                          }
                        }}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                        <div className="text-center">
                          {participant.isConnected ? (
                            <>
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-2"></div>
                              <p className="text-gray-400 text-sm">Connexion...</p>
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
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Chat latéral */}
        {showChat && (
          <div className="w-80 border-l border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-700">
              <h3 className="font-semibold">Chat</h3>
            </div>
            
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className="flex flex-col">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-blue-400">
                        {msg.from === 'local' ? userName : msg.from}
                      </span>
                      <span className="text-xs text-gray-400">
                        {msg.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 mt-1">{msg.message}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            <div className="p-4 border-t border-gray-700">
              <div className="flex space-x-2">
                <Input
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Tapez votre message..."
                  className="flex-1 bg-gray-700 border-gray-600 text-white"
                />
                <Button onClick={handleSendMessage} size="sm">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Contrôles */}
      <div className="flex items-center justify-center space-x-4 p-4 bg-gray-800 border-t border-gray-700">
        <Button
          onClick={toggleAudio}
          variant={isAudioEnabled ? "default" : "destructive"}
          size="lg"
          className="rounded-full w-12 h-12"
        >
          {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </Button>

        <Button
          onClick={toggleVideo}
          variant={isVideoEnabled ? "default" : "destructive"}
          size="lg"
          className="rounded-full w-12 h-12"
        >
          {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </Button>

        <Button
          onClick={toggleScreenShare}
          variant={isScreenSharing ? "destructive" : "default"}
          size="lg"
          className="rounded-full w-12 h-12"
        >
          <Monitor className="w-5 h-5" />
        </Button>

        <Button
          onClick={() => setShowChat(!showChat)}
          variant={showChat ? "default" : "outline"}
          size="lg"
          className="rounded-full w-12 h-12"
        >
          <MessageCircle className="w-5 h-5" />
        </Button>

        <Button
          onClick={disconnect}
          variant="destructive"
          size="lg"
          className="rounded-full w-12 h-12"
        >
          <Phone className="w-5 h-5" />
        </Button>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="absolute top-4 right-4 bg-red-600 text-white p-4 rounded-lg shadow-lg">
          <p className="font-semibold">Erreur</p>
          <p>{error}</p>
        </div>
      )}
    </div>
  );
} 