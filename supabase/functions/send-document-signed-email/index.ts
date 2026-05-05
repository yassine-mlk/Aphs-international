import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const GMAIL_USER = Deno.env.get('GMAIL_USER');
const GMAIL_APP_PASSWORD = Deno.env.get('GMAIL_APP_PASSWORD');

const ALLOWED_ORIGINS = ['https://www.aps-construction.com', 'https://aps-construction.com'];

const getCorsHeaders = (req?: Request) => {
  const origin = req?.headers?.get('origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400',
  };
};

// DEPRECATED: use getCorsHeaders(req) instead
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.aps-construction.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) });
  }

  try {
    const { adminId, documentName, signerName, projectId, comment } = await req.json();

    if (!adminId || !documentName || !signerName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    // Créer le client Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    // Récupérer les infos de l'admin
    const { data: admin, error: adminError } = await supabaseClient
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('user_id', adminId)
      .single();

    if (adminError || !admin?.email) {
      return new Response(
        JSON.stringify({ error: 'Admin not found' }),
        { status: 404, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer les infos du projet
    let projectName = '';
    if (projectId) {
      const { data: project } = await supabaseClient
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .single();
      projectName = project?.name || '';
    }

    // Préparer le contenu de l'email
    const emailSubject = `Document signé - ${documentName}`;
    const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #3b82f6; color: white; padding: 20px; text-align: center; }
    .content { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
    .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Document Signé Électroniquement</h1>
    </div>
    
    <div class="content">
      <p>Bonjour ${admin.first_name || ''} ${admin.last_name || ''},</p>
      
      <p><strong>${signerName}</strong> vient de signer électroniquement le document :</p>
      
      <h2 style="color: #3b82f6;">${documentName}</h2>
      
      ${projectName ? `<p><strong>Projet :</strong> ${projectName}</p>` : ''}
      
      ${comment ? `<p><strong>Commentaire du signataire :</strong></p><blockquote style="border-left: 4px solid #3b82f6; padding-left: 16px; margin: 16px 0; color: #4b5563;">${comment}</blockquote>` : ''}
      
      <p style="margin-top: 24px;">
        <a href="${Deno.env.get('APP_URL') || 'https://app.aps.com'}/dashboard/projets/${projectId || ''}" class="button">
          Voir le document
        </a>
      </p>
    </div>
    
    <div class="footer">
      <p>Cet email a été envoyé automatiquement par le système de signature électronique APS.</p>
      <p>© 2025 APS - Tous droits réservés</p>
    </div>
  </div>
</body>
</html>
    `;

    // Envoyer l'email via Gmail SMTP
    let emailSent = false;
    if (GMAIL_USER && GMAIL_APP_PASSWORD && admin.email) {
      try {
        const smtpClient = new SMTPClient({
          connection: {
            hostname: 'smtp.gmail.com',
            port: 465,
            tls: true,
            auth: {
              username: GMAIL_USER,
              password: GMAIL_APP_PASSWORD,
            },
          },
        });

        await smtpClient.send({
          from: GMAIL_USER,
          to: admin.email,
          subject: emailSubject,
          content: emailBody.replace(/<[^>]*>?/gm, ''), // Version texte simple
          html: emailBody,
        });

        await smtpClient.close();
        emailSent = true;
        console.log(`Email sent to ${admin.email} via Gmail`);
      } catch (emailError) {
        console.error(`Failed to send email to ${admin.email}:`, emailError);
      }
    }
    
    // Créer une notification pour l'admin
    const { error: notifError } = await supabaseClient
      .from('notifications')
      .insert({
        user_id: adminId,
        type: 'document_signed',
        title: 'Document signé par email',
        message: `${signerName} a signé le document "${documentName}"${projectName ? ` pour le projet ${projectName}` : ''}`,
        data: {
          documentName,
          signerName,
          projectId,
          comment,
          emailSent
        },
        is_read: false
      });

    if (notifError) {
      console.error('Error creating notification:', notifError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email notification sent',
        recipient: admin.email 
      }),
      { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-document-signed-email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});
