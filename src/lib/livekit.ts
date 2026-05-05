import { supabase } from '@/lib/supabase';

/**
 * Service pour générer des tokens LiveKit via Edge Function.
 * Les secrets LiveKit sont uniquement côté serveur (Edge Function).
 */
export async function getLiveKitToken(roomName: string, participantName: string, userId: string) {
  const { data, error } = await supabase.functions.invoke('get-livekit-token', {
    body: { roomName, participantName, userId },
  });

  if (error) {
    console.error("Erreur lors de l'appel à l'Edge Function get-livekit-token:", error);
    throw new Error("Impossible de générer le token LiveKit. Vérifiez que l'Edge Function est déployée.");
  }

  if (!data?.token) {
    throw new Error("Token LiveKit non reçu de l'Edge Function.");
  }

  return data.token;
}
