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

// Configuration avec priorité aux variables d'environnement
export const getConfigValue = (key: string, defaultValue: string = '') => {
  // Priorité 1: Variables d'environnement Vite
  if (import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  
  // Priorité 2: Variables globales (fallback historique)
  if (typeof window !== 'undefined' && window.VIDEO_CONFERENCE_CONFIG?.[key]) {
    return window.VIDEO_CONFERENCE_CONFIG[key];
  }
  
  // Priorité 3: Valeur par défaut
  return defaultValue;
};

// Fonction pour initialiser Supabase
const initializeSupabase = () => {
  // URL de Supabase et clé anonyme depuis les variables d'environnement
  const supabaseUrl = getConfigValue('VITE_SUPABASE_URL');
  const supabaseAnonKey = getConfigValue('VITE_SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Configuration Supabase manquante dans .env');
    return null;
  }

  // Client Supabase standard pour les opérations côté client
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });

  // Client Supabase admin pour les opérations d'administration
  const supabaseServiceKey = getConfigValue('VITE_SUPABASE_SERVICE_ROLE_KEY');
  const adminClient = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey, {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }) : null;

  return { client, adminClient };
};

// Initialisation immédiate
const result = initializeSupabase();

// Export des instances (peuvent être null si la config est absente au démarrage)
export const supabase = result?.client;
export const supabaseAdmin = result?.adminClient;
