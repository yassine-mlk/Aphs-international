import { createClient } from '@supabase/supabase-js';

// URL de Supabase et clé anonyme (publique, peut être exposée côté client)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL et Anon Key sont requis. Vérifiez votre fichier .env');
}

// Client Supabase standard pour les opérations côté client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// IMPORTANT: Ce client ne doit être utilisé qu'en développement local
// En production, utilisez une fonction Edge ou un backend sécurisé
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';
const isDevelopment = import.meta.env.DEV || false;

if (isDevelopment && !supabaseServiceKey) {
  console.error('⚠️ VITE_SUPABASE_SERVICE_ROLE_KEY est manquant dans votre fichier .env.local');
  console.error('Les fonctionnalités d\'administration ne seront pas disponibles');
}

// Client Supabase admin pour les opérations d'administration
// Ce client ne doit jamais être exposé en production !
export const supabaseAdmin = isDevelopment && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null; 