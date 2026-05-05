import { createClient } from '@supabase/supabase-js';

// Déclaration des types pour la configuration globale
declare global {
  interface Window {
    VIDEO_CONFERENCE_CONFIG?: {
      VITE_SUPABASE_URL?: string;
      VITE_SUPABASE_ANON_KEY?: string;
      VITE_USE_REALTIME?: string;
      VITE_USE_ROBUST_VIDEO_CONFERENCE?: string;
      [key: string]: string | undefined;
    };
  }
}

// Configuration avec priorité aux variables d'environnement et fallbacks
export const getConfigValue = (key: string, defaultValue: string = '') => {
  // Priorité 1: Variables d'environnement Vite
  if (import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  
  // Priorité 2: Variables globales (fallback historique)
  if (typeof window !== 'undefined' && (window as any).VIDEO_CONFERENCE_CONFIG?.[key]) {
    return (window as any).VIDEO_CONFERENCE_CONFIG[key];
  }
  
  // Priorité 3: Valeur par défaut
  return defaultValue;
};

const createTimedFetch = (timeoutMs: number): typeof fetch => {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const controller = new AbortController();
    if (init?.signal) {
      if (init.signal.aborted) controller.abort();
      else init.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
  };
};

// Fonction pour initialiser Supabase
const initializeSupabase = () => {
  const supabaseUrl = getConfigValue('VITE_SUPABASE_URL');
  const supabaseAnonKey = getConfigValue('VITE_SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Configuration Supabase manquante dans .env');
    return null;
  }

  const timedFetch = createTimedFetch(15000);

  // Client Supabase standard — clé publique uniquement
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      fetch: timedFetch,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });

  return { client };
};

// Initialisation immédiate
const result = initializeSupabase();

// Export de l'instance (peut être null si la config est absente au démarrage)
export const supabase = result?.client;

// NOTE: supabaseAdmin a été supprimé pour des raisons de sécurité.
// La clé SERVICE_ROLE ne doit JAMAIS être exposée côté client.
// Toutes les opérations admin passent désormais par les Edge Functions Supabase.
