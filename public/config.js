// Configuration globale pour la vidéoconférence
window.VIDEO_CONFERENCE_CONFIG = {
  // Variables Supabase
  VITE_SUPABASE_URL: 'https://vcxcxhgmpcgdjabuxcuv.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjeGN4aGdtcGNnZGphYnV4Y3V2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyODYwNzksImV4cCI6MjA2MTg2MjA3OX0.L34j4DHHeYN2KzF1DXIN3IqtjMve88EooQVcihuTM1c',
  
  // Configuration vidéoconférence
  VITE_USE_REALTIME: 'true',
  VITE_USE_ROBUST_VIDEO_CONFERENCE: 'true',
  
  // Configuration WebRTC
  VITE_WEBRTC_ICE_SERVERS: 'stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302,stun:stun2.l.google.com:19302',
  
  // Configuration performance
  VITE_MAX_PARTICIPANTS: '6',
  VITE_VIDEO_QUALITY: '1280x720',
  VITE_AUDIO_QUALITY: '48000'
};

console.log('🔧 Configuration globale chargée:', window.VIDEO_CONFERENCE_CONFIG); 