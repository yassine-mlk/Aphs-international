// Configuration des variables d'environnement avec valeurs par défaut
export const config = {
  // Variables Supabase - Priorité aux variables globales
  supabaseUrl: (window as any)?.VIDEO_CONFERENCE_CONFIG?.VITE_SUPABASE_URL || import.meta.env?.VITE_SUPABASE_URL || 'https://vcxcxhgmpcgdjabuxcuv.supabase.co',
  supabaseAnonKey: (window as any)?.VIDEO_CONFERENCE_CONFIG?.VITE_SUPABASE_ANON_KEY || import.meta.env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjeGN4aGdtcGNnZGphYnV4Y3V2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyODYwNzksImV4cCI6MjA2MTg2MjA3OX0.L34j4DHHeYN2KzF1DXIN3IqtjMve88EooQVcihuTM1c',
  
  // Configuration vidéoconférence - Priorité aux variables globales
  useRealtime: (window as any)?.VIDEO_CONFERENCE_CONFIG?.VITE_USE_REALTIME === 'true' || import.meta.env?.VITE_USE_REALTIME === 'true' || true,
  useRobustVideoConference: (window as any)?.VIDEO_CONFERENCE_CONFIG?.VITE_USE_ROBUST_VIDEO_CONFERENCE === 'true' || import.meta.env?.VITE_USE_ROBUST_VIDEO_CONFERENCE === 'true' || true,
  
  // Configuration WebRTC - Priorité aux variables globales
  webrtcIceServers: (window as any)?.VIDEO_CONFERENCE_CONFIG?.VITE_WEBRTC_ICE_SERVERS || import.meta.env?.VITE_WEBRTC_ICE_SERVERS || 'stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302,stun:stun2.l.google.com:19302',
  
  // Configuration performance - Priorité aux variables globales
  maxParticipants: parseInt((window as any)?.VIDEO_CONFERENCE_CONFIG?.VITE_MAX_PARTICIPANTS || import.meta.env?.VITE_MAX_PARTICIPANTS || '6'),
  videoQuality: (window as any)?.VIDEO_CONFERENCE_CONFIG?.VITE_VIDEO_QUALITY || import.meta.env?.VITE_VIDEO_QUALITY || '1280x720',
  audioQuality: parseInt((window as any)?.VIDEO_CONFERENCE_CONFIG?.VITE_AUDIO_QUALITY || import.meta.env?.VITE_AUDIO_QUALITY || '48000'),
  
  // Mode debug
  isDevelopment: import.meta.env?.DEV || false,
  isProduction: import.meta.env?.PROD || true,
};

// Log de la configuration pour debug
console.log('🔧 Configuration chargée:', {
  useRealtime: config.useRealtime,
  useRobustVideoConference: config.useRobustVideoConference,
  supabaseUrl: config.supabaseUrl,
  isProduction: config.isProduction,
  globalConfigAvailable: !!(window as any)?.VIDEO_CONFERENCE_CONFIG
}); 