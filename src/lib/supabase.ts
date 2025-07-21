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

// Fonction pour initialiser Supabase
const initializeSupabase = () => {
  // Attendre que la configuration soit disponible
  let attempts = 0;
  const maxAttempts = 10;
  
  const tryInitialize = () => {
    attempts++;
    
    // URL de Supabase et clé anonyme avec fallback
    const supabaseUrl = getConfigValue('VITE_SUPABASE_URL', 'https://vcxcxhgmpcgdjabuxcuv.supabase.co');
    const supabaseAnonKey = getConfigValue('VITE_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjeGN4aGdtcGNnZGphYnV4Y3V2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyODYwNzksImV4cCI6MjA2MTg2MjA3OX0.L34j4DHHeYN2KzF1DXIN3IqtjMve88EooQVcihuTM1c');

    console.log(`🔧 Tentative ${attempts} d'initialisation Supabase:`, {
      supabaseUrl,
      supabaseAnonKey: supabaseAnonKey ? '✅ Disponible' : '❌ Manquante',
      globalConfigAvailable: !!(typeof window !== 'undefined' && window.VIDEO_CONFERENCE_CONFIG)
    });

    if (!supabaseUrl || !supabaseAnonKey) {
      if (attempts < maxAttempts) {
        console.log(`⏳ Configuration non disponible, nouvelle tentative dans 500ms... (${attempts}/${maxAttempts})`);
        setTimeout(tryInitialize, 500);
        return null;
      } else {
        console.error('❌ Impossible d\'initialiser Supabase après', maxAttempts, 'tentatives');
        return null;
      }
    }

    // Client Supabase standard pour les opérations côté client
    const client = createClient(supabaseUrl, supabaseAnonKey);
    
    // Client Supabase admin pour les opérations d'administration
    const supabaseServiceKey = getConfigValue('VITE_SUPABASE_SERVICE_ROLE_KEY', '');
    const adminClient = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

    if (!supabaseServiceKey) {
      console.error('⚠️ VITE_SUPABASE_SERVICE_ROLE_KEY est manquant dans votre configuration');
      console.error('Les fonctionnalités d\'administration ne seront pas disponibles');
    }

    console.log('✅ Supabase initialisé avec succès');
    return { client, adminClient };
  };

  return tryInitialize();
};

// Initialisation immédiate ou différée
let supabaseInstance: any = null;
let supabaseAdminInstance: any = null;

// Essayer l'initialisation immédiate
const result = initializeSupabase();
if (result) {
  supabaseInstance = result.client;
  supabaseAdminInstance = result.adminClient;
} else {
  // Si l'initialisation échoue, essayer plus tard
  console.log('⏳ Initialisation différée de Supabase...');
  setTimeout(() => {
    const delayedResult = initializeSupabase();
    if (delayedResult) {
      supabaseInstance = delayedResult.client;
      supabaseAdminInstance = delayedResult.adminClient;
    }
  }, 1000);
}

// Export des clients
export const supabase = supabaseInstance;
export const supabaseAdmin = supabaseAdminInstance; 