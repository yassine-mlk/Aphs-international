// Configuration des variables d'environnement avec valeurs par défaut
export const config = {
  // Variables Supabase
  supabaseUrl: import.meta.env?.VITE_SUPABASE_URL || 'https://vcxcxhgmpcgdjabuxcuv.supabase.co',
  supabaseAnonKey: import.meta.env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjeGN4aGdtcGNnZGphYnV4Y3V2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyODYwNzksImV4cCI6MjA2MTg2MjA3OX0.L34j4DHHeYN2KzF1DXIN3IqtjMve88EooQVcihuTM1c',
  
  // Configuration vidéoconférence
  useRealtime: import.meta.env?.VITE_USE_REALTIME === 'true' || true,
  useRobustVideoConference: import.meta.env?.VITE_USE_ROBUST_VIDEO_CONFERENCE === 'true' || true,
  
  // Configuration WebRTC
  webrtcIceServers: import.meta.env?.VITE_WEBRTC_ICE_SERVERS || 'stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302,stun:stun2.l.google.com:19302',
  
  // Configuration performance
  maxParticipants: parseInt(import.meta.env?.VITE_MAX_PARTICIPANTS || '6'),
  videoQuality: import.meta.env?.VITE_VIDEO_QUALITY || '1280x720',
  audioQuality: parseInt(import.meta.env?.VITE_AUDIO_QUALITY || '48000'),
  
  // Mode debug
  isDevelopment: import.meta.env?.DEV || false,
  isProduction: import.meta.env?.PROD || true,
};

// Log de la configuration pour debug
if (config.isDevelopment) {
  console.log('🔧 Configuration chargée:', {
    useRealtime: config.useRealtime,
    useRobustVideoConference: config.useRobustVideoConference,
    supabaseUrl: config.supabaseUrl,
    isProduction: config.isProduction
  });
} 