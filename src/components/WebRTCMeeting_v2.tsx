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
import { useRealtimeVideoConference } from '../hooks/useRealtimeVideoConference';
import { useRecording } from '../hooks/useRecording';
import { MeetingChat } from './MeetingChat';
import { useAuth } from '../contexts/AuthContext';
import { useSupabase } from '../hooks/useSupabase';

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
  email?: string;
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
  const { getUsers } = useSupabase();
  
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
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [userProfiles, setUserProfiles] = useState<Map<string, { name: string; email: string }>>(new Map());
  
  // Obtenir le nom d'affichage local
  const getLocalDisplayName = useCallback(() => {
    if (user?.user_metadata?.first_name && user?.user_metadata?.last_name) {
      return `${user.user_metadata.first_name} ${user.user_metadata.last_name}`;
    }
    return displayName || user?.email || 'Vous';
  }, [user, displayName]);
  
  // Hook unifié pour la vidéoconférence
  const videoConference = useRealtimeVideoConference({
    roomId,
    userName: getLocalDisplayName(),
    onSignalReceived: (data) => {
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
        console.log(`📡 Processing WebRTC signal from: ${from}`);
        peer.signal(signal);
      }
    }
  });
  
  const recording = useRecording(roomId);

  // Charger les profils utilisateurs
  const loadUserProfiles = useCallback(async (userIds: string[]) => {
    if (userIds.length === 0) return;
    
    try {
      const userData = await getUsers();
      
      if (userData && userData.users) {
        const profilesMap = new Map();
        userData.users.forEach((userItem: any) => {
          if (userIds.includes(userItem.id)) {
            const firstName = userItem.user_metadata?.first_name || '';
            const lastName = userItem.user_metadata?.last_name || '';
            const name = `${firstName} ${lastName}`.trim() || userItem.email || 'Utilisateur';
            
            profilesMap.set(userItem.id, {
              name,
              email: userItem.email || ''
            });
          }
        });

        setUserProfiles(prev => new Map([...prev, ...profilesMap]));
      }
    } catch (error) {
      console.error('Erreur lors du chargement des profils:', error);
      if (user && userIds.includes(user.id)) {
        const name = user.user_metadata?.first_name && user.user_metadata?.last_name
          ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
          : user.email || 'Utilisateur';
        
        setUserProfiles(prev => new Map([...prev, [user.id, { name, email: user.email || '' }]]));
      }
    }
  }, [getUsers, user]);

  // Initialiser le stream local
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
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true;
      }
      
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

  // Créer une connexion peer
  const createPeerConnection = useCallback((participantId: string, initiator: boolean = false) => {
    if (!localStream) {
      console.log(`❌ Cannot create peer connection: no local stream`);
      return;
    }

    console.log(`🔗 Creating peer connection with ${participantId}, initiator: ${initiator}`);

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
      console.log(`📡 Sending signal to ${participantId}:`, signal.type);
      videoConference.sendSignal(signal, participantId);
    });

    peer.on('stream', (remoteStream) => {
      console.log(`🎥 Received stream from ${participantId}`);
      setParticipants(prev => prev.map(p => 
        p.id === participantId 
          ? { ...p, stream: remoteStream, peer }
          : p
      ));
      
      setTimeout(() => {
        const videoElement = remoteVideosRef.current[participantId];
        if (videoElement) {
          videoElement.srcObject = remoteStream;
          console.log(`📺 Stream attached to video element for ${participantId}`);
        }
      }, 100);
    });

    peer.on('connect', () => {
      console.log(`🤝 Peer connected: ${participantId}`);
    });

    peer.on('error', (error) => {
      console.error(`❌ Peer error with ${participantId}:`, error);
      toast({
        title: "Erreur de connexion",
        description: `Problème avec ${userProfiles.get(participantId)?.name || participantId}`,
        variant: "destructive"
      });
    });

    peer.on('close', () => {
      console.log(`🔌 Peer connection closed: ${participantId}`);
      delete peersRef.current[participantId];
      setParticipants(prev => prev.filter(p => p.id !== participantId));
    });

    return peer;
  }, [localStream, videoConference, toast, userProfiles]);

  // Gérer les nouveaux participants
  useEffect(() => {
    if (!videoConference.isConnected || !localStream) return;

    console.log(`🔄 Managing participants. Connected: ${videoConference.isConnected}, Local stream: ${!!localStream}`);
    console.log(`👥 Participants: [${videoConference.participants.join(', ')}]`);

    // Charger les profils des participants
    const newParticipantIds = videoConference.participants.filter(id => !userProfiles.has(id));
    if (newParticipantIds.length > 0) {
      console.log(`📋 Loading profiles for: [${newParticipantIds.join(', ')}]`);
      loadUserProfiles(newParticipantIds);
    }

    // Créer des connexions pour les participants existants
    videoConference.participants.forEach(participantId => {
      if (!peersRef.current[participantId]) {
        console.log(`🤝 Creating peer connection with: ${participantId}`);
        
        const userProfile = userProfiles.get(participantId);
        const participant: Participant = {
          id: participantId,
          name: userProfile?.name || 'Chargement...',
          email: userProfile?.email
        };
        
        setParticipants(prev => {
          if (!prev.find(p => p.id === participantId)) {
            console.log(`➕ Adding participant to UI: ${participantId}`);
            return [...prev, participant];
          }
          return prev;
        });
        
        createPeerConnection(participantId, true);
      } else {
        console.log(`✅ Peer connection already exists for: ${participantId}`);
      }
    });

    // Nettoyer les connexions pour les participants qui ont quitté
    const currentParticipantIds = videoConference.participants;
    setParticipants(prev => {
      const filtered = prev.filter(p => currentParticipantIds.includes(p.id));
      if (filtered.length !== prev.length) {
        console.log(`🧹 Cleaned up ${prev.length - filtered.length} participants from UI`);
      }
      return filtered;
    });

    // Nettoyer les connexions peer pour les participants qui ont quitté
    Object.keys(peersRef.current).forEach(participantId => {
      if (!currentParticipantIds.includes(participantId)) {
        console.log(`🔌 Closing peer connection for: ${participantId}`);
        peersRef.current[participantId].destroy();
        delete peersRef.current[participantId];
      }
    });

  }, [videoConference.participants, videoConference.isConnected, localStream, createPeerConnection, userProfiles, loadUserProfiles]);

  // Mettre à jour les noms des participants
  useEffect(() => {
    setParticipants(prev => prev.map(p => {
      const userProfile = userProfiles.get(p.id);
      if (userProfile && p.name === 'Chargement...') {
        return {
          ...p,
          name: userProfile.name,
          email: userProfile.email
        };
      }
      return p;
    }));
  }, [userProfiles]);

  // Initialiser la réunion au montage
  useEffect(() => {
    initializeLocalStream();
    
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      
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
          
          videoTrack.onended = () => {
            setIsScreenSharing(false);
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
            {getLocalDisplayName()} {!isVideoEnabled && "(caméra off)"}
            {isModerator && (
              <span className="ml-1 text-xs bg-blue-500 px-1 rounded">MOD</span>
            )}
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
        messages={videoConference.messages}
        onSendMessage={videoConference.sendChatMessage}
        isOpen={isChatOpen}
        onToggle={() => setIsChatOpen(!isChatOpen)}
        participantCount={videoConference.participants.length + 1}
      />
    </div>
  );
} 