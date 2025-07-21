import { createClient } from '@supabase/supabase-js';

// Déclaration des types pour la configuration globale
declare global {
  interface Window {
    VIDEO_CONFERENCE_CONFIG?: {
      VITE_SUPABASE_URL?: string;
      VITE_SUPABASE_ANON_KEY?: string;
      VITE_SUPABASE_SERVICE_ROLE_KEY?: string;
      VITE_USE_REALTIME?: string;
      VITE_USE_ROBUST_VIDEO_CONFERENCE?: string;
      [key: string]: string | undefined;
    };
  }
}

// Configuration avec priorité aux variables globales
const getConfigValue = (key: string, defaultValue: string = '') => {
  // Priorité 1: Variables globales (config.js)
  if (typeof window !== 'undefined' && window.VIDEO_CONFERENCE_CONFIG?.[key]) {
    return window.VIDEO_CONFERENCE_CONFIG[key];
  }
  
  // Priorité 2: Variables d'environnement Vite
  if (import.meta.env?.[key]) {
    return import.meta.env[key];
  }
  
  // Priorité 3: Valeur par défaut
  return defaultValue;
};

// URL de Supabase et clé anonyme avec fallback
const supabaseUrl = getConfigValue('VITE_SUPABASE_URL', 'https://vcxcxhgmpcgdjabuxcuv.supabase.co');
const supabaseAnonKey = getConfigValue('VITE_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjeGN4aGdtcGNnZGphYnV4Y3V2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyODYwNzksImV4cCI6MjA2MTg2MjA3OX0.L34j4DHHeYN2KzF1DXIN3IqtjMve88EooQVcihuTM1c');

console.log('🔧 Initialisation Supabase:', {
  supabaseUrl,
  supabaseAnonKey: supabaseAnonKey ? '✅ Disponible' : '❌ Manquante',
  globalConfigAvailable: !!(typeof window !== 'undefined' && window.VIDEO_CONFERENCE_CONFIG)
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase URL et Anon Key sont requis. Vérifiez votre configuration');
}

// Client Supabase standard pour les opérations côté client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Client Supabase admin pour les opérations d'administration
const supabaseServiceKey = getConfigValue('VITE_SUPABASE_SERVICE_ROLE_KEY', '');

if (!supabaseServiceKey) {
  console.error('⚠️ VITE_SUPABASE_SERVICE_ROLE_KEY est manquant dans votre configuration');
  console.error('Les fonctionnalités d\'administration ne seront pas disponibles');
}

// Client Supabase admin pour les opérations d'administration
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null; 