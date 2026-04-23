import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Peer from 'simple-peer';
import RecordRTC from 'recordrtc';
import { supabase } from '@/lib/supabase';
import { uploadToR2 } from '@/lib/r2';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Mic, MicOff, Video, VideoOff, PhoneOff, Users, 
  MessageSquare, CircleStop, Radio, Monitor, 
  Maximize2, LayoutGrid, User, X, Send
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Props {
  roomId: string;
  onLeave: () => void;
  isAdmin: boolean;
}

interface Participant {
  userId: string;
  userName: string;
  stream?: MediaStream;
  peer?: Peer.Instance;
  isMicOn?: boolean;
  isVideoOn?: boolean;
}

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: string;
}

export default function MeetingRoom({ roomId, onLeave, isAdmin }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Media States
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  // UI States
  const [participants, setParticipants] = useState<Map<string, Participant>>(new Map());
  const [showParticipants, setShowParticipants] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [viewMode, setViewMode] = useState<'gallery' | 'speaker'>('gallery');
  
  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const channelRef = useRef<any>(null);
  const peersRef = useRef<Map<string, Peer.Instance>>(new Map());
  const recorderRef = useRef<RecordRTC | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Persistance & Protection
  useEffect(() => {
    localStorage.setItem('active_video_meeting', roomId);
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      localStorage.removeItem('active_video_meeting');
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [roomId]);

  const setupMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (error) {
      console.error("Error accessing media devices:", error);
      toast({
        variant: "destructive",
        title: "Erreur média",
        description: "Impossible d'accéder à la caméra ou au micro."
      });
      return null;
    }
  };

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      setScreenStream(stream);
      setIsScreenSharing(true);
      
      // Update peers with new stream
      peersRef.current.forEach(peer => {
        if (localStream) peer.replaceTrack(localStream.getVideoTracks()[0], stream.getVideoTracks()[0], localStream);
      });

      stream.getVideoTracks()[0].onended = () => stopScreenShare();
    } catch (error) {
      console.error("Error screen sharing:", error);
    }
  };

  const stopScreenShare = () => {
    if (screenStream) {
      screenStream.getTracks().forEach(t => t.stop());
      setScreenStream(null);
    }
    setIsScreenSharing(false);
    // Switch back to camera
    if (localStream) {
      peersRef.current.forEach(peer => {
        peer.replaceTrack(screenStream?.getVideoTracks()[0]!, localStream.getVideoTracks()[0], localStream);
      });
    }
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !channelRef.current) return;
    
    const msg: ChatMessage = {
      id: Math.random().toString(36).substr(2, 9),
      userId: user?.id || '',
      userName: `${user?.user_metadata?.first_name || ''} ${user?.user_metadata?.last_name || ''}`.trim() || 'Moi',
      content: newMessage,
      timestamp: new Date().toISOString()
    };

    channelRef.current.send({
      type: 'broadcast',
      event: 'chat_message',
      payload: msg
    });

    setMessages(prev => [...prev, msg]);
    setNewMessage('');
  };

  const endMeetingForAll = async () => {
    if (!isAdmin) return;
    try {
      await supabase.from('video_meetings').update({ status: 'completed', ended_at: new Date().toISOString() }).eq('id', roomId);
      channelRef.current.send({ type: 'broadcast', event: 'meeting_ended', payload: {} });
      onLeave();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
    }
  };

  const handleExit = async () => {
    await supabase.from('video_meeting_participants').update({ left_at: new Date().toISOString() }).eq('meeting_id', roomId).eq('user_id', user?.id);
    onLeave();
  };

  const iceServers = useMemo(() => 
    import.meta.env.VITE_WEBRTC_ICE_SERVERS 
      ? import.meta.env.VITE_WEBRTC_ICE_SERVERS.split(',').map((urls: string) => ({ urls: urls.trim() }))
      : [{ urls: 'stun:stun.l.google.com:19302' }]
  , []);

  const createPeer = (userId: string, initiator: boolean, stream: MediaStream) => {
    const peer = new Peer({ initiator, trickle: false, stream, config: { iceServers } });

    peer.on('signal', (signal) => {
      channelRef.current.send({ type: 'broadcast', event: 'signal', payload: { signal, to: userId, from: user?.id } });
    });

    peer.on('stream', (remoteStream) => {
      setParticipants(prev => {
        const newMap = new Map(prev);
        const p = newMap.get(userId);
        if (p) newMap.set(userId, { ...p, stream: remoteStream });
        return newMap;
      });
    });

    return peer;
  };

  useEffect(() => {
    let stream: MediaStream | null = null;
    const init = async () => {
      stream = await setupMedia();
      if (!stream) return;

      const channel = supabase.channel(`video-room-${roomId}`, {
        config: { broadcast: { self: false }, presence: { key: user?.id } }
      });
      channelRef.current = channel;

      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          Object.keys(state).forEach(id => {
            if (id !== user?.id && !peersRef.current.has(id)) {
              // Règle déterministe : l'ID le plus petit appelle l'ID le plus grand
              const shouldInitiate = user?.id! < id;
              
              if (shouldInitiate) {
                console.log(`[WebRTC] Initiation de la connexion vers ${id}`);
                const peer = createPeer(id, true, stream!);
                peersRef.current.set(id, peer);
                setParticipants(prev => new Map(prev).set(id, { 
                  userId: id, 
                  userName: state[id][0]?.userName || 'Utilisateur', 
                  peer 
                }));
              }
            }
          });
        })
        .on('presence', { event: 'leave' }, ({ leftPresences }) => {
          leftPresences.forEach(p => {
            const userId = p.userId;
            console.log(`[WebRTC] Participant quitté: ${userId}`);
            peersRef.current.get(userId)?.destroy();
            peersRef.current.delete(userId);
            setParticipants(prev => { const nm = new Map(prev); nm.delete(userId); return nm; });
          });
        })
        .on('broadcast', { event: 'signal' }, ({ payload }) => {
          if (payload.to === user?.id) {
            let peer = peersRef.current.get(payload.from);
            if (!peer) {
              console.log(`[WebRTC] Signal reçu de ${payload.from}, création du peer récepteur`);
              peer = createPeer(payload.from, false, stream!);
              peersRef.current.set(payload.from, peer);
              setParticipants(prev => new Map(prev).set(payload.from, { 
                userId: payload.from, 
                userName: 'Participant...', // Sera mis à jour par sync
                peer 
              }));
            }
            peer.signal(payload.signal);
          }
        })
        .on('broadcast', { event: 'chat_message' }, ({ payload }) => {
          setMessages(prev => [...prev, payload]);
        })
        .on('broadcast', { event: 'meeting_ended' }, () => {
          toast({ title: "L'administrateur a terminé la réunion" });
          onLeave();
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({
              userId: user?.id,
              userName: `${user?.user_metadata?.first_name || ''} ${user?.user_metadata?.last_name || ''}`.trim() || user?.email,
              online_at: new Date().toISOString(),
            });
          }
        });
    };
    init();
    return () => {
      stream?.getTracks().forEach(t => t.stop());
      peersRef.current.forEach(p => p.destroy());
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [roomId, user?.id]);

  const toggleMic = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(t => t.enabled = !isMicOn);
      setIsMicOn(!isMicOn);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(t => t.enabled = !isVideoOn);
      setIsVideoOn(!isVideoOn);
    }
  };

  const startRecording = async () => {
    if (!localStream) return;
    try {
      const recorder = new RecordRTC(localStream, { type: 'video', mimeType: 'video/webm' });
      recorder.startRecording();
      recorderRef.current = recorder;
      setIsRecording(true);
      toast({ title: "Enregistrement démarré" });
    } catch (error) { console.error(error); }
  };

  const stopRecording = async () => {
    if (!recorderRef.current) return;
    recorderRef.current.stopRecording(async () => {
      const blob = recorderRef.current!.getBlob();
      setIsRecording(false);
      try {
        const fileName = `recordings/meeting-${roomId}-${Date.now()}.webm`;
        toast({ title: "Sauvegarde sur R2..." });
        const publicUrl = await uploadToR2(blob, fileName);
        await supabase.from('video_meetings').update({ recording_url: publicUrl }).eq('id', roomId);
        toast({ title: "Enregistrement sauvegardé" });
      } catch (error: any) { toast({ variant: "destructive", title: "Erreur", description: error.message }); }
    });
  };

  // Grid logic
  const participantList = Array.from(participants.values());
  const totalPeople = participantList.length + 1;
  
  const gridCols = totalPeople === 1 ? 'grid-cols-1' : totalPeople === 2 ? 'grid-cols-2' : totalPeople <= 4 ? 'grid-cols-2' : 'grid-cols-3';

  return (
    <div className="fixed inset-0 bg-[#1a1a1a] z-50 flex flex-col overflow-hidden text-white font-sans">
      {/* Header */}
      <div className="h-14 px-6 flex items-center justify-between bg-[#111] border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
            <Video className="w-5 h-5 text-white" />
          </div>
          <h2 className="font-semibold text-sm">APS Visioconférence — Salle {roomId.substring(0,8)}</h2>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="border-green-500/50 text-green-500 bg-green-500/10 gap-1">
            <Radio className="w-3 h-3 animate-pulse" /> En direct
          </Badge>
          <Button variant="ghost" size="icon" onClick={() => setViewMode(viewMode === 'gallery' ? 'speaker' : 'gallery')}>
            {viewMode === 'gallery' ? <Maximize2 className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Video Grid */}
        <div className={cn(
          "flex-1 p-6 grid gap-4 transition-all duration-300",
          gridCols,
          (showParticipants || showChat) ? "mr-80" : ""
        )}>
          {/* Local Video */}
          <VideoTile 
            ref={localVideoRef} 
            name="Vous" 
            isLocal 
            isMicOn={isMicOn} 
            isVideoOn={isVideoOn} 
          />

          {/* Remote Videos */}
          {participantList.map((p) => (
            <VideoTile 
              key={p.userId} 
              stream={p.stream} 
              name={p.userName} 
              isMicOn={true} // In a real app, track these via broadcast
              isVideoOn={!!p.stream} 
            />
          ))}
        </div>

        {/* Sidebar - Participants */}
        {showParticipants && (
          <div className="w-80 bg-[#111] border-l border-white/5 flex flex-col absolute right-0 top-0 bottom-0 z-20">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-bold">Participants ({totalPeople})</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowParticipants(false)}><X className="w-4 h-4" /></Button>
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">Moi</div>
                    <span className="text-sm">Vous (Hôte)</span>
                  </div>
                  <div className="flex gap-1">
                    {isMicOn ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3 text-destructive" />}
                    {isVideoOn ? <Video className="w-3 h-3" /> : <VideoOff className="h-3 w-3 text-destructive" />}
                  </div>
                </div>
                {participantList.map(p => (
                  <div key={p.userId} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold">{p.userName.charAt(0)}</div>
                      <span className="text-sm">{p.userName}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Sidebar - Chat */}
        {showChat && (
          <div className="w-80 bg-[#111] border-l border-white/5 flex flex-col absolute right-0 top-0 bottom-0 z-20">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-bold">Chat de réunion</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowChat(false)}><X className="w-4 h-4" /></Button>
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map(m => (
                  <div key={m.id} className={cn("flex flex-col gap-1", m.userId === user?.id ? "items-end" : "items-start")}>
                    <span className="text-[10px] text-muted-foreground">{m.userName} • {new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    <div className={cn("px-3 py-2 rounded-2xl text-sm max-w-[90%]", m.userId === user?.id ? "bg-primary text-white" : "bg-[#222]")}>
                      {m.content}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            </ScrollArea>
            <div className="p-4 bg-[#111] border-t border-white/5 flex gap-2">
              <Input 
                value={newMessage} 
                onChange={e => setNewMessage(e.target.value)}
                placeholder="Message..." 
                className="bg-[#222] border-none focus-visible:ring-1 focus-visible:ring-primary"
                onKeyPress={e => e.key === 'Enter' && sendMessage()}
              />
              <Button size="icon" onClick={sendMessage} className="shrink-0"><Send className="w-4 h-4" /></Button>
            </div>
          </div>
        )}
      </div>

      {/* Control Bar */}
      <div className="h-24 bg-[#111] border-t border-white/5 flex items-center justify-between px-8 z-30">
        <div className="flex items-center gap-6">
          <ControlBtn icon={isMicOn ? Mic : MicOff} label={isMicOn ? "Muet" : "Activer"} onClick={toggleMic} active={isMicOn} />
          <ControlBtn icon={isVideoOn ? Video : VideoOff} label={isVideoOn ? "Arrêter" : "Démarrer"} onClick={toggleVideo} active={isVideoOn} />
        </div>

        <div className="flex items-center gap-4">
          <ControlBtn icon={Monitor} label="Partager" onClick={isScreenSharing ? stopScreenShare : startScreenShare} active={isScreenSharing} />
          <ControlBtn icon={Users} label="Participants" onClick={() => {setShowParticipants(!showParticipants); setShowChat(false);}} active={showParticipants} />
          <ControlBtn icon={MessageSquare} label="Chat" onClick={() => {setShowChat(!showChat); setShowParticipants(false);}} active={showChat} />
          
          {isAdmin && (
            <ControlBtn 
              icon={isRecording ? CircleStop : Radio} 
              label={isRecording ? "Arrêter" : "Enregistrer"} 
              onClick={isRecording ? stopRecording : startRecording} 
              active={isRecording} 
              className={isRecording ? "text-destructive" : ""}
            />
          )}
        </div>

        <div className="flex items-center gap-3">
          {isAdmin ? (
            <Button variant="destructive" className="rounded-xl h-12 px-6 font-bold flex gap-2 shadow-lg shadow-destructive/20" onClick={endMeetingForAll}>
              <CircleStop className="w-5 h-5" /> Mettre fin
            </Button>
          ) : (
            <Button variant="destructive" className="rounded-xl h-12 px-6 font-bold flex gap-2" onClick={handleExit}>
              <PhoneOff className="w-5 h-5" /> Quitter
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

const VideoTile = React.forwardRef<HTMLVideoElement, { 
  stream?: MediaStream, 
  name: string, 
  isLocal?: boolean,
  isMicOn: boolean,
  isVideoOn: boolean
}>(({ stream, name, isLocal, isMicOn, isVideoOn }, ref) => {
  useEffect(() => {
    if (!isLocal && ref && 'current' in ref && ref.current && stream) {
      ref.current.srcObject = stream;
    }
  }, [stream, isLocal, ref]);

  return (
    <Card className="relative overflow-hidden bg-[#222] border-none flex items-center justify-center shadow-2xl group ring-1 ring-white/5">
      <video
        ref={ref}
        autoPlay
        muted={isLocal}
        playsInline
        className={cn("w-full h-full object-cover", isLocal && "mirror", !isVideoOn && "hidden")}
      />
      
      {!isVideoOn && (
        <div className="flex flex-col items-center gap-4">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-primary/20">
            <User className="w-12 h-12 text-primary" />
          </div>
          <span className="text-sm font-medium text-white/50">{name}</span>
        </div>
      )}

      {/* Overlay info */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-xs font-semibold">{name} {isLocal && "(Moi)"}</span>
        {!isMicOn && <MicOff className="w-3 h-3 text-destructive" />}
      </div>
    </Card>
  );
});

function ControlBtn({ icon: Icon, label, onClick, active, className }: any) {
  return (
    <div className="flex flex-col items-center gap-1.5 min-w-[64px]">
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={onClick}
        className={cn(
          "w-12 h-12 rounded-2xl transition-all duration-200",
          active ? "bg-white/10 text-white" : "bg-destructive/10 text-destructive hover:bg-destructive/20",
          className
        )}
      >
        <Icon className="w-6 h-6" />
      </Button>
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
    </div>
  );
}

