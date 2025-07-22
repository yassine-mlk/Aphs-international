import React, { useRef, useEffect } from 'react';
import { useRealVideoConference } from '@/hooks/useRealVideoConference';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Monitor, 
  MonitorOff, 
  Phone, 
  PhoneOff,
  Send,
  Users,
  MessageCircle
} from 'lucide-react';

interface SimpleVideoConferenceProps {
  roomId: string;
  userName: string;
  onError?: (error: string) => void;
}

export function SimpleVideoConference({ roomId, userName, onError }: SimpleVideoConferenceProps) {
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
  } = useRealVideoConference({ roomId, userName, onError });

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);

  // Afficher le stream local
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Envoyer un message
  const handleSendMessage = () => {
    if (messageInputRef.current && messageInputRef.current.value.trim()) {
      sendMessage(messageInputRef.current.value.trim());
      messageInputRef.current.value = '';
    }
  };

  // Envoyer avec Enter
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold">Vidéoconférence</h2>
          <Badge variant={isConnected ? "default" : "secondary"}>
            {connectionStatus === 'connected' ? 'Connecté' : 
             connectionStatus === 'connecting' ? 'Connexion...' : 
             connectionStatus === 'error' ? 'Erreur' : 'Déconnecté'}
          </Badge>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-300">
            {participants.length + 1} participant(s)
          </span>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="flex-1 flex">
        {/* Zone vidéo */}
        <div className="flex-1 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full">
            {/* Vidéo locale */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-300">
                  Vous ({userName})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
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

            {/* Participants */}
            {participants.map((participant) => (
              <Card key={participant.id} className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-300 flex items-center justify-between">
                    <span>{participant.name}</span>
                    <Badge variant={participant.isConnected ? "default" : "secondary"} className="text-xs">
                      {participant.isConnected ? 'Connecté' : 'En attente'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                    {participant.stream ? (
                      <video
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                        ref={(el) => {
                          if (el) el.srcObject = participant.stream;
                        }}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                        <Users className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Chat */}
        <div className="w-80 border-l border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <h3 className="font-semibold flex items-center">
              <MessageCircle className="w-4 h-4 mr-2" />
              Chat
            </h3>
          </div>
          
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {messages.map((message) => (
                <div key={message.id} className="flex flex-col">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-blue-400">
                      {message.fromName}
                    </span>
                    <span className="text-xs text-gray-400">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 mt-1">{message.message}</p>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="p-4 border-t border-gray-700">
            <div className="flex space-x-2">
              <Input
                ref={messageInputRef}
                placeholder="Tapez votre message..."
                className="flex-1 bg-gray-800 border-gray-600 text-white"
                onKeyPress={handleKeyPress}
              />
              <Button size="sm" onClick={handleSendMessage}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Contrôles */}
      <div className="p-4 bg-gray-800 border-t border-gray-700">
        <div className="flex items-center justify-center space-x-4">
          <Button
            variant={isAudioEnabled ? "default" : "destructive"}
            size="lg"
            onClick={toggleAudio}
            className="rounded-full w-12 h-12"
          >
            {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </Button>

          <Button
            variant={isVideoEnabled ? "default" : "destructive"}
            size="lg"
            onClick={toggleVideo}
            className="rounded-full w-12 h-12"
          >
            {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </Button>

          <Button
            variant={isScreenSharing ? "default" : "outline"}
            size="lg"
            onClick={toggleScreenShare}
            className="rounded-full w-12 h-12"
          >
            {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
          </Button>

          <Button
            variant="destructive"
            size="lg"
            onClick={disconnect}
            className="rounded-full w-12 h-12"
          >
            <PhoneOff className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="absolute top-4 right-4 bg-red-600 text-white p-3 rounded-lg shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
} 