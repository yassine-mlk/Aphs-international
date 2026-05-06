import React, { useEffect, useState, useRef } from 'react';
import {
  LiveKitRoom,
  VideoConference,
  formatChatMessageLinks,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { useAuth } from '@/contexts/AuthContext';
import { getLiveKitToken } from '@/lib/livekit';
import { supabase, getConfigValue } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Circle, StopCircle } from 'lucide-react';
import { useVideoConference } from '@/hooks/useVideoConference';
import RecordRTC from 'recordrtc';
import { uploadToR2 } from '@/lib/r2';

interface Props {
  roomId: string;
  onLeave: () => void;
  isAdmin: boolean;
}

export default function MeetingRoom({ roomId, onLeave, isAdmin }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { leaveMeeting } = useVideoConference();
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // États pour l'enregistrement
  const [isRecording, setIsRecording] = useState(false);
  const recorderRef = useRef<RecordRTC | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const serverUrl = getConfigValue('VITE_LIVEKIT_URL');

  useEffect(() => {
    const fetchToken = async () => {
      if (!user?.id) return;
      
      if (!serverUrl || serverUrl.trim() === '' || serverUrl.includes('votre-projet')) {
        setError("L'URL du serveur LiveKit n'est pas configurée. Veuillez vérifier votre fichier .env ou config.js (VITE_LIVEKIT_URL).");
        return;
      }
      
      try {
        const name = `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() || user.email || 'Anonyme';
        const token = await getLiveKitToken(roomId, name, user.id);
        setToken(token);
      } catch (e: any) {
        console.error("Failed to get LiveKit token:", e);
        setError(e.message || "Impossible de générer le jeton d'accès LiveKit.");
        toast({
          variant: "destructive",
          title: "Erreur de configuration",
          description: e.message || "Les clés API LiveKit sont manquantes ou incorrectes."
        });
      }
    };

    fetchToken();

    // Souscription en temps réel pour détecter quand l'admin clôture la réunion
    const channel = supabase
      .channel(`meeting-status-${roomId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'video_meetings',
        filter: `id=eq.${roomId}`
      }, (payload) => {
        const newStatus = payload.new.status;
        if (newStatus === 'completed' || newStatus === 'cancelled') {
          toast({
            title: "Réunion terminée",
            description: "L'admin a mis fin à cette réunion.",
          });
          setTimeout(() => {
            handleDisconnected();
          }, 2000);
        }
      })
      .subscribe();

    // Polling de sécurité (fallback) au cas où le Webhook Realtime saute
    const checkStatusInterval = setInterval(async () => {
      try {
        const { data } = await supabase
          .from('video_meetings')
          .select('status')
          .eq('id', roomId)
          .single();
          
        if (data && (data.status === 'completed' || data.status === 'cancelled')) {
          toast({
            title: "Réunion terminée",
            description: "La session a été clôturée.",
          });
          handleDisconnected();
        }
      } catch (e) {
        // Ignorer les erreurs réseau silencieuses
      }
    }, 15000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(checkStatusInterval);
    };
  }, [roomId, user, toast, serverUrl]);

  const handleDisconnected = async () => {
    if (isRecording) {
      await stopRecording();
    }
    await leaveMeeting(roomId);
    onLeave();
  };

  const handleMeetingEnd = async () => {
    if (!isAdmin) return;
    
    try {
      if (isRecording) {
        await stopRecording();
      }

      const { error } = await supabase
        .from('video_meetings')
        .update({ 
          status: 'completed',
          ended_at: new Date().toISOString() 
        })
        .eq('id', roomId);

      if (error) throw error;
      await leaveMeeting(roomId);
      onLeave();
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: e.message
      });
    }
  };

  const startRecording = async () => {
    try {
      // Pour capturer toute la réunion (vidéo + audio système), getDisplayMedia est le plus adapté
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      streamRef.current = stream;
      
      const recorder = new RecordRTC(stream, {
        type: 'video',
        mimeType: 'video/webm;codecs=vp9',
        bitsPerSecond: 1280000,
      });

      recorder.startRecording();
      recorderRef.current = recorder;
      setIsRecording(true);

      toast({
        title: "Enregistrement démarré",
        description: "La session est en cours d'enregistrement."
      });

      // Gérer l'arrêt si l'utilisateur arrête le partage d'écran via le navigateur
      stream.getVideoTracks()[0].onended = () => {
        if (isRecording) stopRecording();
      };

    } catch (e: any) {
      console.error("Recording error:", e);
      toast({
        variant: "destructive",
        title: "Erreur d'enregistrement",
        description: "Impossible de démarrer l'enregistrement : " + e.message
      });
    }
  };

  const stopRecording = async () => {
    if (!recorderRef.current) return;

    return new Promise<void>((resolve) => {
      recorderRef.current?.stopRecording(async () => {
        const blob = recorderRef.current?.getBlob();
        if (blob) {
          try {
            toast({
              title: "Traitement de l'enregistrement",
              description: "Téléchargement vers Cloudflare R2 en cours..."
            });

            const fileName = `recordings/${roomId}_${Date.now()}.webm`;
            const publicUrl = await uploadToR2(blob, fileName);

            // Mettre à jour la réunion avec l'URL de l'enregistrement
            await supabase
              .from('video_meetings')
              .update({ recording_url: publicUrl })
              .eq('id', roomId);

            toast({
              title: "Enregistrement sauvegardé",
              description: "La vidéo est disponible dans l'historique."
            });
          } catch (e: any) {
            console.error("Upload error:", e);
            toast({
              variant: "destructive",
              title: "Erreur de sauvegarde",
              description: "L'enregistrement n'a pas pu être sauvegardé sur R2."
            });
          }
        }

        // Nettoyage
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        setIsRecording(false);
        recorderRef.current = null;
        resolve();
      });
    });
  };

  if (error) {
    return (
      <div className="fixed inset-0 bg-[#1a1a1a] z-50 flex flex-col items-center justify-center text-white p-6 text-center">
        <h2 className="text-2xl font-bold mb-4">Erreur de visioconférence</h2>
        <p className="text-muted-foreground mb-6 max-w-md">{error}</p>
        <button 
          onClick={onLeave}
          className="px-6 py-2 bg-primary rounded-lg font-bold"
        >
          Retourner au tableau de bord
        </button>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="fixed inset-0 bg-[#1a1a1a] z-50 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-lg font-medium">Préparation de la salle...</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#1a1a1a] z-50 flex flex-col overflow-hidden text-white font-sans lk-custom-theme">
      <style>{`
        .lk-watermark { display: none !important; }
        .lk-branding { display: none !important; }
        .lk-video-conference { background-color: #1a1a1a !important; }
        .lk-control-bar { background-color: #111 !important; border-top: 1px solid rgba(255,255,255,0.05) !important; }
        .lk-button { border-radius: 12px !important; }
        .lk-participant-name { font-weight: 600 !important; }
      `}</style>
      <LiveKitRoom
        video={true}
        audio={true}
        token={token}
        serverUrl={serverUrl}
        onDisconnected={handleDisconnected}
        data-lk-theme="default"
        style={{ height: '100vh' }}
      >
        <VideoConference 
          chatMessageFormatter={formatChatMessageLinks}
        />
        
        {/* Contrôles d'enregistrement pour l'admin */}
        {isAdmin && (
          <div className="absolute top-4 right-4 z-50 flex gap-2">
            {!isRecording ? (
              <button
                onClick={startRecording}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-md text-sm font-bold shadow-lg transition-colors backdrop-blur-md border border-white/10"
              >
                <Circle className="w-4 h-4 text-red-500 fill-red-500" />
                Enregistrer
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-bold shadow-lg transition-colors"
              >
                <StopCircle className="w-4 h-4 animate-pulse" />
                Arrêter
              </button>
            )}

            <button
              onClick={handleMeetingEnd}
              className="px-4 py-2 bg-destructive text-white rounded-md text-sm font-bold shadow-lg hover:bg-destructive/90 transition-colors"
            >
              Clore la session (Admin)
            </button>
          </div>
        )}
      </LiveKitRoom>
    </div>
  );
}
