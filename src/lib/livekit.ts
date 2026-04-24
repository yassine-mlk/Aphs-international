import { AccessToken } from 'livekit-server-sdk';
import { supabase, getConfigValue } from '@/lib/supabase';

/**
 * Service pour générer des tokens LiveKit
 * En production, cela devrait être fait via une Supabase Edge Function
 * pour ne pas exposer le LIVEKIT_API_SECRET côté client.
 */
export async function getLiveKitToken(roomName: string, participantName: string, userId: string) {
  // Tentative d'appel à une Edge Function (Recommandé)
  try {
    const { data, error } = await supabase.functions.invoke('get-livekit-token', {
      body: { roomName, participantName, userId },
    });
    
    if (!error && data?.token) {
      return data.token;
    }
  } catch (e) {
    console.error("Edge function call failed, falling back to local generation (DEV ONLY):", e);
  }

  // FALLBACK DEV ONLY: Génération locale si les clés sont présentes
  // On utilise getConfigValue pour supporter config.js et .env
  const apiKey = getConfigValue('VITE_LIVEKIT_API_KEY');
  const apiSecret = getConfigValue('VITE_LIVEKIT_API_SECRET');

  if (!apiKey || !apiSecret) {
    throw new Error("Clés API LiveKit manquantes. Veuillez configurer VITE_LIVEKIT_API_KEY et VITE_LIVEKIT_API_SECRET.");
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: userId,
    name: participantName,
  });

  at.addGrant({ 
    roomJoin: true, 
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true
  });

  return await at.toJwt();
}
