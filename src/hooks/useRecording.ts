import { useCallback, useRef, useState } from 'react';
import RecordRTC from 'recordrtc';
import { useSupabase } from './useSupabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

export function useRecording(roomId: string) {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const recorderRef = useRef<RecordRTC | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout>();

  const startRecording = useCallback(async (stream: MediaStream) => {
    try {
      if (!user) {
        throw new Error('Utilisateur non connecté');
      }

      // Créer l'enregistreur
      const recorder = new RecordRTC(stream, {
        type: 'video',
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 128000,
        audioBitsPerSecond: 128000,
        frameInterval: 90,
        timeSlice: 1000,
        ondataavailable: (blob: Blob) => {
          // Optionnel: traitement en temps réel des chunks
          console.log('Recording chunk:', blob.size);
        }
      });

      recorderRef.current = recorder;
      recorder.startRecording();
      setIsRecording(true);
      setRecordingDuration(0);

      // Démarrer le compteur de durée
      intervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      // Trouver l'ID de la réunion à partir du room_id
      const { data: meetingData, error: meetingError } = await supabase
        .from('video_meetings')
        .select('id')
        .eq('room_id', roomId)
        .single();

      if (meetingError) {
        console.error('Erreur pour trouver la réunion:', meetingError);
      }

      // Enregistrer dans la base de données le début de l'enregistrement
      const { error: dbError } = await supabase
        .from('meeting_recordings')
        .insert({
          meeting_id: meetingData?.id,
          meeting_room_id: roomId,
          recorded_by: user.id,
          status: 'recording',
          started_at: new Date().toISOString()
        });

      if (dbError) {
        console.error('Erreur DB recording:', dbError);
      }

      toast({
        title: "Enregistrement démarré",
        description: "La réunion est maintenant enregistrée"
      });

    } catch (error) {
      console.error('Erreur démarrage enregistrement:', error);
      toast({
        title: "Erreur",
        description: "Impossible de démarrer l'enregistrement",
        variant: "destructive"
      });
    }
  }, [user, supabase, roomId, toast]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!recorderRef.current || !user) {
        resolve(null);
        return;
      }

      const recorder = recorderRef.current;
      
      recorder.stopRecording(async () => {
        try {
          setIsRecording(false);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }

          // Obtenir le blob de l'enregistrement
          const blob = recorder.getBlob();
          const fileName = `recording_${roomId}_${Date.now()}.webm`;
          
          // Upload vers Supabase Storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('meeting-recordings')
            .upload(fileName, blob, {
              contentType: 'video/webm',
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            throw uploadError;
          }

          // Obtenir l'URL publique
          const { data: { publicUrl } } = supabase.storage
            .from('meeting-recordings')
            .getPublicUrl(fileName);

          // Mettre à jour la base de données
          const { error: dbError } = await supabase
            .from('meeting_recordings')
            .update({
              status: 'completed',
              file_path: fileName,
              file_url: publicUrl,
              duration_seconds: recordingDuration,
              ended_at: new Date().toISOString()
            })
            .eq('meeting_room_id', roomId)
            .eq('recorded_by', user.id)
            .eq('status', 'recording');

          if (dbError) {
            console.error('Erreur mise à jour DB:', dbError);
          }

          toast({
            title: "Enregistrement terminé",
            description: `Enregistrement sauvegardé (${Math.floor(recordingDuration / 60)}:${String(recordingDuration % 60).padStart(2, '0')})`
          });

          resolve(publicUrl);

        } catch (error) {
          console.error('Erreur sauvegarde enregistrement:', error);
          toast({
            title: "Erreur de sauvegarde",
            description: "L'enregistrement n'a pas pu être sauvegardé",
            variant: "destructive"
          });
          resolve(null);
        }
      });
    });
  }, [user, supabase, roomId, recordingDuration, toast]);

  const formatDuration = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  }, []);

  return {
    isRecording,
    recordingDuration,
    formatDuration,
    startRecording,
    stopRecording
  };
} 