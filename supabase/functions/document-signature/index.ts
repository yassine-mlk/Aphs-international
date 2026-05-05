import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const ALLOWED_ORIGINS = ['https://www.aps-construction.com', 'https://aps-construction.com', 'http://localhost:5173'];

const getCorsHeaders = (req?: Request) => {
  const origin = req?.headers?.get('origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400',
  };
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: getCorsHeaders(req) });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') || '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  );

  const url = new URL(req.url);

  try {
    // 1. GET: Fetch document info securely (bypassing RLS)
    if (req.method === 'GET') {
      const token = url.searchParams.get('token');
      if (!token) {
        return new Response(JSON.stringify({ error: 'Token missing' }), { status: 400, headers: getCorsHeaders(req) });
      }

      const { data: recipient, error } = await supabaseClient
        .from('document_recipients')
        .select(`
          id, status, signed_at, signature_token, token_expires_at, user_name,
          project_documents (
            id, name, created_at, uploaded_by_name, uploaded_by, project_id,
            projects (name)
          )
        `)
        .eq('signature_token', token)
        .single();

      if (error || !recipient) {
        return new Response(JSON.stringify({ error: 'Invalid or expired token' }), { status: 404, headers: getCorsHeaders(req) });
      }

      // Check expiration server-side
      if (recipient.token_expires_at && new Date(recipient.token_expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: 'Token expired', data: recipient }), { status: 400, headers: getCorsHeaders(req) });
      }

      return new Response(JSON.stringify({ data: recipient }), { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } });
    }

    // 2. POST: Process the signature and capture audit trail
    if (req.method === 'POST') {
      const body = await req.json();
      const { token, comment } = body;

      if (!token) {
        return new Response(JSON.stringify({ error: 'Token missing' }), { status: 400, headers: getCorsHeaders(req) });
      }

      // Collect Audit Trail Data
      const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
      const userAgent = req.headers.get('user-agent') || 'unknown';

      // Verify token
      const { data: recipient, error: fetchError } = await supabaseClient
        .from('document_recipients')
        .select('id, status, token_expires_at, project_documents(uploaded_by)')
        .eq('signature_token', token)
        .single();

      if (fetchError || !recipient) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 404, headers: getCorsHeaders(req) });
      }

      if (recipient.token_expires_at && new Date(recipient.token_expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: 'Token expired' }), { status: 400, headers: getCorsHeaders(req) });
      }

      if (recipient.status === 'signed') {
        return new Response(JSON.stringify({ error: 'Document already signed' }), { status: 400, headers: getCorsHeaders(req) });
      }

      // Perform Signature
      const { error: updateError } = await supabaseClient
        .from('document_recipients')
        .update({
          status: 'signed',
          signed_at: new Date().toISOString(),
          signature_token: null, // Invalidate token
          signature_method: 'email_link',
          signature_ip: ip,
          signature_user_agent: userAgent,
          comment: comment || null
        })
        .eq('id', recipient.id);

      if (updateError) {
        throw updateError;
      }

      // Create admin notification
      const uploadedBy = Array.isArray(recipient.project_documents) 
        ? recipient.project_documents[0]?.uploaded_by 
        : recipient.project_documents?.uploaded_by;
        
      const docName = Array.isArray(recipient.project_documents) 
        ? recipient.project_documents[0]?.name 
        : recipient.project_documents?.name;

      if (uploadedBy) {
        await supabaseClient.from('notifications').insert({
          user_id: uploadedBy,
          type: 'document_signed',
          title: 'Document signé par email',
          message: `${recipient.user_name} a signé le document "${docName}"`,
          data: {
            documentName: docName,
            signerName: recipient.user_name,
            projectId: null,
            signatureMethod: 'email_link'
          },
          is_read: false
        });

        // Envoyer un email à l'admin
        await supabaseClient.functions.invoke('send-document-signed-email', {
          body: {
            adminId: uploadedBy,
            documentName: docName,
            signerName: recipient.user_name,
            projectId: null,
            comment: comment || 'Signé via lien email'
          }
        });
      }

      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } });
    }

    return new Response('Method not allowed', { status: 405, headers: getCorsHeaders(req) });

  } catch (err: any) {
    console.error('Signature process error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } });
  }
});
