import { createClient } from '@supabase/supabase-js';

// URL de Supabase et clé anonyme (publique, peut être exposée côté client)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL et Anon Key sont requis. Vérifiez votre fichier .env');
}

// Client Supabase standard pour les opérations côté client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Client Supabase admin pour les opérations d'administration
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseServiceKey) {
  console.error('⚠️ VITE_SUPABASE_SERVICE_ROLE_KEY est manquant dans vos variables d\'environnement');
  console.error('Les fonctionnalités d\'administration ne seront pas disponibles');
}

// Client Supabase admin pour les opérations d'administration
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null; 