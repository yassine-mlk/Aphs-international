// WebRTC utility functions and configurations

export interface WebRTCConfig {
  iceServers: RTCIceServer[];
  iceCandidatePoolSize?: number;
}

export const defaultWebRTCConfig: WebRTCConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' }
  ],
  iceCandidatePoolSize: 10
};

export const defaultSimplePeerOptions = (
  initiator: boolean,
  stream: MediaStream,
  participantId?: string
) => ({
  initiator,
  trickle: true, // Enable trickle ICE for better performance
  stream,
  config: defaultWebRTCConfig,
  channelConfig: {},
  channelName: participantId ? `datachannel_${participantId}` : 'datachannel',
  allowHalfTrickle: true
});

export const checkWebRTCSupport = (): { 
  supported: boolean; 
  error?: string; 
  features: {
    getUserMedia: boolean;
    RTCPeerConnection: boolean;
    mediaDevices: boolean;
  }
} => {
  const features = {
    getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    RTCPeerConnection: typeof RTCPeerConnection !== 'undefined',
    mediaDevices: !!navigator.mediaDevices
  };

  if (!features.mediaDevices) {
    return {
      supported: false,
      error: 'MediaDevices API not supported',
      features
    };
  }

  if (!features.getUserMedia) {
    return {
      supported: false,
      error: 'getUserMedia not supported',
      features
    };
  }

  if (!features.RTCPeerConnection) {
    return {
      supported: false,
      error: 'RTCPeerConnection not supported',
      features
    };
  }

  return {
    supported: true,
    features
  };
};

export const getOptimalMediaConstraints = (quality: 'low' | 'medium' | 'high' = 'medium') => {
  const constraints = {
    low: {
      video: {
        width: { ideal: 640, max: 854 },
        height: { ideal: 360, max: 480 },
        frameRate: { ideal: 15, max: 20 }
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    },
    medium: {
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
    },
    high: {
      video: {
        width: { ideal: 1920, max: 3840 },
        height: { ideal: 1080, max: 2160 },
        frameRate: { ideal: 30, max: 60 }
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: { ideal: 48000 }
      }
    }
  };

  return constraints[quality];
};

export const handleMediaError = (error: Error): string => {
  const errorCode = (error as any).name || error.message;
  
  switch (errorCode) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'Permission d\'accès à la caméra/microphone refusée. Veuillez autoriser l\'accès dans les paramètres du navigateur.';
    
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'Aucune caméra ou microphone trouvé. Veuillez vérifier que vos périphériques sont connectés.';
    
    case 'NotReadableError':
    case 'TrackStartError':
      return 'Impossible d\'accéder à la caméra/microphone. L\'appareil est peut-être déjà utilisé par une autre application.';
    
    case 'OverconstrainedError':
    case 'ConstraintNotSatisfiedError':
      return 'Les paramètres demandés ne sont pas supportés par votre appareil.';
    
    case 'NotSupportedError':
      return 'WebRTC n\'est pas supporté dans ce navigateur.';
    
    case 'TypeError':
      return 'Erreur de configuration WebRTC. Veuillez rafraîchir la page.';
    
    default:
      return `Erreur d'accès aux médias: ${error.message}`;
  }
};

export const cleanupMediaStream = (stream: MediaStream | null) => {
  if (stream) {
    stream.getTracks().forEach(track => {
      track.stop();
    });
  }
}; 