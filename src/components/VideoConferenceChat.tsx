import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { 
  Send, 
  MessageSquare, 
  X, 
  Minimize2, 
  Maximize2 
} from 'lucide-react';
import { useSupabase } from '../hooks/useSupabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './ui/use-toast';

interface ChatMessage {
  id: string;
  message: string;
  from: string;
  fromName: string;
  timestamp: string;
  roomId: string;
}

interface VideoConferenceChatProps {
  roomId: string;
  currentUserId: string;
  displayName: string;
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

export const VideoConferenceChat: React.FC<VideoConferenceChatProps> = ({
  roomId,
  currentUserId,
  displayName,
  isOpen,
  onToggle,
  className = ''
}) => {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll vers le bas quand il y a de nouveaux messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Se connecter au canal de chat
  useEffect(() => {
    if (!supabase || !roomId || channelRef.current) return;

    const connectToChat = async () => {
      try {
        console.log(`💬 Connecting to chat for room: ${roomId}`);
        
        const channel = supabase.channel(`chat_${roomId}`, {
          config: {
            broadcast: { self: false, ack: false }
          }
        });

        channelRef.current = channel;

        // Écouter les nouveaux messages
        channel.on('broadcast', { event: 'chat_message' }, ({ payload }) => {
          const message = payload as ChatMessage;
          console.log(`💬 Received chat message from ${message.fromName}:`, message.message);
          
          setMessages(prev => {
            // Éviter les doublons
            if (prev.find(m => m.id === message.id)) {
              return prev;
            }
            return [...prev, message];
          });

          // Incrémenter le compteur de messages non lus si le chat n'est pas ouvert
          if (!isOpen || isMinimized) {
            setUnreadCount(prev => prev + 1);
          }
        });

        // S'abonner au canal
        await channel.subscribe((status) => {
          console.log(`💬 Chat subscription status: ${status}`);
          setIsConnected(status === 'SUBSCRIBED');
        });

      } catch (error) {
        console.error('❌ Error connecting to chat:', error);
      }
    };

    connectToChat();

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
        setIsConnected(false);
      }
    };
  }, [supabase, roomId, isOpen, isMinimized]);

  // Réinitialiser le compteur de messages non lus quand le chat est ouvert
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setUnreadCount(0);
    }
  }, [isOpen, isMinimized]);

  // Envoyer un message
  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !channelRef.current || !isConnected) {
      return;
    }

    try {
      const message: ChatMessage = {
        id: `${currentUserId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        message: newMessage.trim(),
        from: currentUserId,
        fromName: displayName,
        timestamp: new Date().toISOString(),
        roomId
      };

      // Ajouter le message localement d'abord
      setMessages(prev => [...prev, message]);

      // Envoyer via Supabase
      await channelRef.current.send({
        type: 'broadcast',
        event: 'chat_message',
        payload: message
      });

      setNewMessage('');
      
      console.log(`💬 Sent message: ${message.message}`);
    } catch (error) {
      console.error('❌ Error sending message:', error);
      toast({
        title: "Erreur d'envoi",
        description: "Impossible d'envoyer le message. Réessayez.",
        variant: "destructive"
      });
    }
  }, [newMessage, currentUserId, displayName, roomId, isConnected, toast]);

  // Gérer la soumission du formulaire
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    sendMessage();
  }, [sendMessage]);

  // Gérer les raccourcis clavier
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  if (!isOpen) {
    return (
      <Button
        onClick={onToggle}
        className="fixed bottom-4 right-4 h-12 w-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg z-50"
        size="sm"
      >
        <MessageSquare className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>
    );
  }

  return (
    <Card className={`fixed bottom-4 right-4 w-80 h-96 shadow-lg z-50 bg-white border-gray-200 ${className}`}>
      <CardHeader className="pb-2 px-4 py-3 bg-blue-600 text-white rounded-t-lg">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Chat ({messages.length})
            {!isConnected && (
              <div className="h-2 w-2 bg-yellow-400 rounded-full animate-pulse" />
            )}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              onClick={() => setIsMinimized(!isMinimized)}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-white hover:bg-blue-700"
            >
              {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
            </Button>
            <Button
              onClick={onToggle}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-white hover:bg-blue-700"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {!isMinimized && (
        <CardContent className="p-0 flex flex-col h-full">
          {/* Messages */}
          <ScrollArea className="flex-1 p-3">
            <div className="space-y-3">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 text-sm py-8">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  Aucun message pour l'instant.
                  <br />
                  Soyez le premier à écrire !
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.from === currentUserId ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                        message.from === currentUserId
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      {message.from !== currentUserId && (
                        <div className="text-xs font-medium mb-1 opacity-75">
                          {message.fromName}
                        </div>
                      )}
                      <div className="break-words">{message.message}</div>
                      <div className={`text-xs mt-1 opacity-75 ${
                        message.from === currentUserId ? 'text-blue-200' : 'text-gray-500'
                      }`}>
                        {new Date(message.timestamp).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Zone de saisie */}
          <div className="border-t border-gray-200 p-3">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                ref={inputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tapez votre message..."
                className="flex-1 text-sm"
                disabled={!isConnected}
                maxLength={500}
              />
              <Button
                type="submit"
                size="sm"
                disabled={!newMessage.trim() || !isConnected}
                className="px-3"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </CardContent>
      )}
    </Card>
  );
}; 