import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { AccessToken } from "https://esm.sh/livekit-server-sdk@1.2.7"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, corsHeaders } from '../_shared/cors.ts';



// DEPRECATED: use getCorsHeaders(req) instead
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.aps-construction.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) })
  }

  try {
    // Create Supabase admin client for auth verification
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify caller's JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Aucun token d\'authentification fourni' }),
        { status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: verifyError } = await supabaseAdmin.auth.getUser(token)

    if (verifyError || !caller) {
      return new Response(
        JSON.stringify({ error: 'Token invalide' }),
        { status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    const { roomName, participantName, userId, isAdmin } = await req.json()

    // Verify the requesting user matches the userId in the request
    if (caller.id !== userId) {
      return new Response(
        JSON.stringify({ error: 'userId ne correspond pas au token d\'authentification' }),
        { status: 403, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    const apiKey = Deno.env.get('LIVEKIT_API_KEY')
    const apiSecret = Deno.env.get('LIVEKIT_API_SECRET')

    if (!apiKey || !apiSecret) {
      throw new Error('LIVEKIT_API_KEY or LIVEKIT_API_SECRET not set')
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: userId,
      name: participantName,
    })

    at.addGrant({ 
      roomJoin: true, 
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      roomAdmin: isAdmin === true
    })

    const jwt = await at.toJwt()

    return new Response(
      JSON.stringify({ token: jwt }),
      { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }, status: 400 },
    )
  }
})
