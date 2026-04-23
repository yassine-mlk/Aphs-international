import { useEffect, useRef, useState, useCallback } from 'react';

export const useLocalVideoStream = () => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const localStreamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);

  // Initialiser le stream local
  const initializeStream = useCallback(async () => {
    if (localStreamRef.current) {
      return localStreamRef.current;
    }

    setIsLoading(true);
    setError(null);

    try {
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      if (!mountedRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return null;
      }

      localStreamRef.current = stream;
      setLocalStream(stream);
      
      // Initialiser les états selon les tracks
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      
      setIsVideoEnabled(videoTrack ? videoTrack.enabled : false);
      setIsAudioEnabled(audioTrack ? audioTrack.enabled : false);
      
        streamId: stream.id,
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length,
        videoEnabled: videoTrack?.enabled,
        audioEnabled: audioTrack?.enabled
      });
      
      return stream;
    } catch (error) {
      setError(`Erreur d'accès média: ${error.message}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Nettoyer le stream
  const cleanupStream = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
      setIsAudioEnabled(true);
      setIsVideoEnabled(true);
    }
  }, []);

  // Contrôles audio/vidéo
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        return audioTrack.enabled;
      }
    }
    return false;
  }, []);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
        return videoTrack.enabled;
      }
    }
    return false;
  }, []);

  // Initialiser automatiquement au montage
  useEffect(() => {
    mountedRef.current = true;
    initializeStream();

    return () => {
      mountedRef.current = false;
      cleanupStream();
    };
  }, [initializeStream, cleanupStream]);

  return {
    localStream,
    isLoading,
    error,
    isAudioEnabled,
    isVideoEnabled,
    initializeStream,
    cleanupStream,
    toggleAudio,
    toggleVideo
  };
}; 