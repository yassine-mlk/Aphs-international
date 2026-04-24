import React, { useEffect, useState } from 'react';
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
import { Loader2 } from 'lucide-react';

interface Props {
  roomId: string;
  onLeave: () => void;
  isAdmin: boolean;
}

export default function MeetingRoom({ roomId, onLeave, isAdmin }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
  }, [roomId, user, toast, serverUrl]);

  const handleDisconnected = () => {
    onLeave();
  };

  const handleMeetingEnd = async () => {
    if (!isAdmin) return;
    
    try {
      const { error } = await supabase
        .from('video_meetings')
        .update({ 
          status: 'completed',
          ended_at: new Date().toISOString() 
        })
        .eq('id', roomId);

      if (error) throw error;
      onLeave();
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: e.message
      });
    }
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
        
        {/* Bouton spécial pour l'admin pour clore la session en base de données */}
        {isAdmin && (
          <div className="absolute top-4 right-20 z-50">
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
