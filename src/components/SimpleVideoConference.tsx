import React, { useRef, useEffect, useMemo, useState } from 'react';
import { useWebSocketVideoConference } from '@/hooks/useWebSocketVideoConference';
import { useRobustVideoConference } from '@/hooks/useRobustVideoConference';
import { config } from '@/config/environment';
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
  const conference = config.useRobustVideoConference
    ? useRobustVideoConference({ roomId, userName, onError })
    : useWebSocketVideoConference({ roomId, userName, onError });

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
  } = conference;

  const chatMessages = messages as Array<{
    id: string;
    from: string;
    fromName?: string;
    message: string;
    timestamp: Date;
  }>;

  const [isChatOpen, setIsChatOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(min-width: 1024px)').matches;
  });

  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string>('local');
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserMapRef = useRef<Map<string, { analyser: AnalyserNode; source: MediaStreamAudioSourceNode }>>(new Map());
  const rafRef = useRef<number | null>(null);

  const tileCount = participants.length + 1;
  const gridColsClass = useMemo(() => {
    if (tileCount <= 1) return 'grid-cols-1';
    if (tileCount <= 4) return 'grid-cols-1 md:grid-cols-2';
    return 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3';
  }, [tileCount]);

  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return !window.matchMedia('(min-width: 1024px)').matches;
  }, []);

  type Tile = {
    id: string;
    name: string;
    stream?: MediaStream;
    isConnected: boolean;
    isAudioEnabled: boolean;
    isVideoEnabled: boolean;
    isSpeaking: boolean;
    networkQuality: 'good' | 'unstable' | 'bad';
    isLocal: boolean;
  };

  const videoTiles: Tile[] = useMemo(() => {
    const localTile = {
      id: 'local',
      name: `Vous (${userName})`,
      stream: localStream ?? undefined,
      isConnected: true,
      isAudioEnabled,
      isVideoEnabled,
      isSpeaking: false,
      networkQuality: 'good' as 'good' | 'unstable' | 'bad',
      isLocal: true
    } as Tile;

    const remoteTiles: Tile[] = participants.map(p => ({
      id: p.id,
      name: p.name,
      stream: p.stream,
      isConnected: p.isConnected,
      isAudioEnabled: p.isAudioEnabled ?? true,
      isVideoEnabled: p.isVideoEnabled ?? true,
      isSpeaking: p.isSpeaking ?? false,
      networkQuality: p.networkQuality ?? 'good',
      isLocal: false
    }));

    return [localTile, ...remoteTiles];
  }, [participants, userName, localStream, isAudioEnabled, isVideoEnabled]);

  useEffect(() => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new AudioContext();
      } catch {
        audioContextRef.current = null;
      }
    }

    const ctx = audioContextRef.current;
    if (!ctx) return;

    const tilesWithAudio = videoTiles.filter(t => {
      if (!t.stream) return false;
      if (t.id === 'local' && !isAudioEnabled) return false;
      if (t.id !== 'local' && !t.isAudioEnabled) return false;
      return t.stream.getAudioTracks().length > 0;
    });

    const desiredIds = new Set(tilesWithAudio.map(t => t.id));
    analyserMapRef.current.forEach((value, id) => {
      if (!desiredIds.has(id)) {
        try {
          value.source.disconnect();
          value.analyser.disconnect();
        } catch {}
        analyserMapRef.current.delete(id);
      }
    });

    tilesWithAudio.forEach(t => {
      if (analyserMapRef.current.has(t.id)) return;
      try {
        const source = ctx.createMediaStreamSource(t.stream as MediaStream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        source.connect(analyser);
        analyserMapRef.current.set(t.id, { analyser, source });
      } catch {}
    });

    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const buffer = new Uint8Array(1024);
    const update = () => {
      if (ctx.state === 'suspended') {
        rafRef.current = requestAnimationFrame(update);
        return;
      }

      let bestId: string | null = null;
      let bestScore = 0;

      analyserMapRef.current.forEach(({ analyser }, id) => {
        analyser.getByteTimeDomainData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          const v = (buffer[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buffer.length);
        if (rms > bestScore) {
          bestScore = rms;
          bestId = id;
        }
      });

      if (bestId && bestScore > 0.03) {
        setActiveSpeakerId(bestId);
      }

      rafRef.current = requestAnimationFrame(update);
    };

    rafRef.current = requestAnimationFrame(update);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [videoTiles, isAudioEnabled]);

  useEffect(() => {
    const onPointerDown = () => {
      const ctx = audioContextRef.current;
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => undefined);
      }
      window.removeEventListener('pointerdown', onPointerDown);
    };
    window.addEventListener('pointerdown', onPointerDown, { once: true });
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, []);

  const layoutMode = useMemo(() => {
    if (isScreenSharing) return 'screen-share-focus';
    if (pinnedId) return 'pinned';
    if (isMobile || tileCount >= 3) return 'speaker';
    return 'mosaic';
  }, [isScreenSharing, pinnedId, isMobile, tileCount]);

  const primaryTileId = useMemo(() => {
    if (layoutMode === 'screen-share-focus') return 'local';
    if (layoutMode === 'pinned' && pinnedId) return pinnedId;
    if (layoutMode === 'speaker') return activeSpeakerId;
    return null;
  }, [layoutMode, pinnedId, activeSpeakerId]);

  const primaryTile = useMemo(() => {
    if (!primaryTileId) return null;
    return videoTiles.find(t => t.id === primaryTileId) ?? videoTiles[0] ?? null;
  }, [primaryTileId, videoTiles]);

  const secondaryTiles = useMemo(() => {
    if (!primaryTileId) return videoTiles;
    return videoTiles.filter(t => t.id !== primaryTileId);
  }, [videoTiles, primaryTileId]);

  const messageInputRef = useRef<HTMLInputElement>(null);

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

  const renderTile = (tile: Tile, options: { size: 'primary' | 'secondary' | 'mosaic' }) => {
    const isPinned = pinnedId === tile.id;
    const isActive = tile.id === activeSpeakerId && layoutMode === 'speaker' && !pinnedId && !isScreenSharing;
    const minH =
      options.size === 'primary'
        ? 'min-h-[260px] sm:min-h-[420px]'
        : options.size === 'secondary'
          ? 'min-h-[140px]'
          : 'min-h-[220px] sm:min-h-[280px]';

    const VideoEl = React.memo(({ stream, muted }: { stream?: MediaStream; muted: boolean }) => {
      const ref = useRef<HTMLVideoElement>(null);
      useEffect(() => {
        const el = ref.current;
        if (el && stream && el.srcObject !== stream) {
          el.srcObject = stream;
        }
      }, [stream]);
      return (
        <video
          ref={ref}
          autoPlay
          playsInline
          muted={muted}
          className="w-full h-full object-cover"
        />
      );
    });

    return (
      <Card key={tile.id} className={`bg-gray-800 border-gray-700 h-full ${isActive ? 'ring-2 ring-aphs-teal' : ''}`}>
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-sm text-gray-300 flex items-center justify-between gap-2">
            <span className="truncate">{tile.name}</span>
            <div className="flex items-center gap-2">
              {!tile.isConnected && (
                <Badge variant="secondary" className="text-xs">En attente</Badge>
              )}
              {tile.isConnected && (
                <Badge variant="default" className="text-xs">Connecté</Badge>
              )}
              {tile.networkQuality === 'unstable' && (
                <Badge variant="secondary" className="text-xs">Connexion instable</Badge>
              )}
              {tile.networkQuality === 'bad' && (
                <Badge variant="destructive" className="text-xs">Mauvaise connexion</Badge>
              )}
              {!tile.isLocal && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPinnedId(prev => (prev === tile.id ? null : tile.id))}
                  className="h-7 px-2 bg-gray-900 text-gray-100 border-gray-600 hover:bg-gray-700 hover:text-white"
                >
                  {isPinned ? 'Désépingler' : 'Épingler'}
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 h-full">
          <div className={`relative w-full bg-gray-900 rounded-lg overflow-hidden aspect-video ${minH}`}>
            {tile.stream ? (
              <VideoEl stream={tile.isLocal ? localStream ?? undefined : tile.stream} muted={tile.isLocal} />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                <Users className="w-12 h-12 text-gray-400" />
              </div>
            )}

            {tile.isSpeaking && (
              <div className="absolute top-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded">
                Parle
              </div>
            )}
            {!tile.isAudioEnabled && (
              <div className="absolute top-2 right-2 bg-black/60 rounded-full p-2">
                <MicOff className="w-4 h-4 text-white" />
              </div>
            )}

            {!tile.isVideoEnabled && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                <VideoOff className="w-12 h-12 text-gray-400" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 md:p-4 bg-gray-800 border-b border-gray-700 shrink-0">
        <div className="flex items-center space-x-3 md:space-x-4 min-w-0">
          <h2 className="text-base md:text-xl font-semibold truncate">Vidéoconférence</h2>
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsChatOpen(prev => !prev)}
            className="bg-gray-900 text-gray-100 border-gray-600 hover:bg-gray-700 hover:text-white"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            {isChatOpen ? 'Masquer le chat' : 'Afficher le chat'}
          </Button>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        {/* Zone vidéo */}
        <div className="flex-1 p-3 md:p-4 min-h-0 overflow-y-auto">
          {layoutMode === 'mosaic' && (
            <div className={`grid ${gridColsClass} gap-3 md:gap-4 auto-rows-[minmax(220px,1fr)] sm:auto-rows-[minmax(280px,1fr)]`}>
              {videoTiles.map(tile => renderTile(tile, { size: 'mosaic' }))}
            </div>
          )}

          {layoutMode !== 'mosaic' && primaryTile && (
            <div className="h-full min-h-0 flex flex-col lg:flex-row gap-3 md:gap-4">
              <div className="flex-1 min-h-0">
                {renderTile(primaryTile, { size: 'primary' })}
              </div>
              <div className="shrink-0 lg:w-[340px] xl:w-[380px]">
                <div className="flex lg:flex-col gap-3 overflow-x-auto lg:overflow-x-hidden lg:overflow-y-auto pb-1 lg:pb-0 max-h-[34vh] lg:max-h-[calc(100vh-220px)]">
                  {secondaryTiles.map(tile => (
                    <div key={tile.id} className="min-w-[260px] lg:min-w-0">
                      {renderTile(tile, { size: 'secondary' })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Chat */}
        {isChatOpen && (
          <div className="w-full lg:w-72 xl:w-80 border-t lg:border-t-0 lg:border-l border-gray-700 flex flex-col max-h-[40vh] lg:max-h-none">
            <div className="p-4 border-b border-gray-700">
              <h3 className="font-semibold flex items-center">
                <MessageCircle className="w-4 h-4 mr-2" />
                Chat
              </h3>
            </div>
            
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {chatMessages.map((message) => (
                  <div key={message.id} className="flex flex-col">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-blue-400">
                        {message.fromName ?? message.from}
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
        )}
      </div>

      {/* Contrôles */}
      <div className="p-4 bg-gray-800 border-t border-gray-700 shrink-0">
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
            className={isScreenSharing ? "rounded-full w-12 h-12" : "rounded-full w-12 h-12 bg-gray-900 text-gray-100 border-gray-600 hover:bg-gray-700 hover:text-white"}
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
