import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

// Gmail SMTP Configuration
const GMAIL_USER = Deno.env.get('GMAIL_USER'); // ex: tonemail@gmail.com
const GMAIL_APP_PASSWORD = Deno.env.get('GMAIL_APP_PASSWORD'); // Mot de passe d'application Gmail

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const generateToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/[+/=]/g, '')
    .substring(0, 32);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { recipients, documentName, projectName, uploadedByName, documentId, projectId } = await req.json();

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing recipients' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    const appUrl = Deno.env.get('APP_URL') || 'https://app.aps.com';
    const results = [];

    // Configurer le client SMTP Gmail
    let smtpClient: SMTPClient | null = null;
    if (GMAIL_USER && GMAIL_APP_PASSWORD) {
      try {
        smtpClient = new SMTPClient({
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
      } catch (smtpError) {
        console.error('SMTP connection error:', smtpError);
      }
    }

    for (const recipient of recipients) {
      const token = generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { error: updateError } = await supabaseClient
        .from('document_recipients')
        .update({
          signature_token: token,
          token_expires_at: expiresAt.toISOString()
        })
        .eq('id', recipient.recipientId);

      if (updateError) {
        console.error('Error updating recipient:', updateError);
        results.push({ recipientId: recipient.recipientId, success: false, error: 'Failed to generate token' });
        continue;
      }

      const signatureLink = `${appUrl}/signer/${token}`;
      const emailSubject = `Document à signer : ${documentName}`;
      
      // Version texte simple de l'email
      const emailText = `
Bonjour ${recipient.name},

${uploadedByName} vous demande de signer électroniquement un document${projectName ? ` pour le projet "${projectName}"` : ''}.

Détails du document :
- Nom : ${documentName}
${projectName ? `- Projet : ${projectName}\n` : ''}- Envoyé par : ${uploadedByName}

Pour signer le document, cliquez sur ce lien :
${signatureLink}

⚠️ Important : Ce lien est personnel et sécurisé. Ne le partagez pas.
Il expire le ${expiresAt.toLocaleDateString('fr-FR')}.

Cet email a été envoyé automatiquement par APS.
`;

      // Version HTML
      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background: #f9fafb; }
    .header { background: #2563eb; color: white; padding: 30px 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px 20px; }
    .document-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .document-info h2 { margin-top: 0; color: #1f2937; font-size: 18px; }
    .info-row { margin: 10px 0; }
    .info-label { color: #6b7280; font-size: 14px; }
    .info-value { color: #1f2937; font-weight: 500; }
    .button-container { text-align: center; margin: 30px 0; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 16px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; }
    .button:hover { background: #1d4ed8; }
    .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; font-size: 14px; color: #92400e; }
    .footer { text-align: center; color: #9ca3af; font-size: 12px; padding: 20px; }
    .link-fallback { word-break: break-all; color: #2563eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📄 Document à signer</h1>
    </div>
    <div class="content">
      <p>Bonjour ${recipient.name},</p>
      <p><strong>${uploadedByName}</strong> vous demande de signer électroniquement un document${projectName ? ` pour le projet <strong>${projectName}</strong>` : ''}.</p>
      <div class="document-info">
        <h2>Détails du document</h2>
        <div class="info-row">
          <span class="info-label">Nom du document :</span><br>
          <span class="info-value">${documentName}</span>
        </div>
        ${projectName ? `
        <div class="info-row">
          <span class="info-label">Projet :</span><br>
          <span class="info-value">${projectName}</span>
        </div>
        ` : ''}
        <div class="info-row">
          <span class="info-label">Envoyé par :</span><br>
          <span class="info-value">${uploadedByName}</span>
        </div>
      </div>
      <div class="button-container">
        <a href="${signatureLink}" class="button">Signer le document</a>
      </div>
      <div class="warning">
        <strong>⚠️ Important :</strong> Ce lien est personnel et sécurisé. Ne le partagez pas. 
        Il expire le <strong>${expiresAt.toLocaleDateString('fr-FR')}</strong>.
      </div>
      <p style="font-size: 14px; color: #6b7280;">
        Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :<br>
        <span class="link-fallback">${signatureLink}</span>
      </p>
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement par APS.</p>
      <p>© 2025 APS - Tous droits réservés</p>
    </div>
  </div>
</body>
</html>`;

      let emailSent = false;
      try {
        if (recipient.email && smtpClient) {
          await smtpClient.send({
            from: GMAIL_USER || 'noreply@aps.com',
            to: recipient.email,
            subject: emailSubject,
            content: emailText,
            html: emailHtml,
          });
          emailSent = true;
          console.log(`Email sent to ${recipient.email} via Gmail`);
        } else if (!smtpClient) {
          console.log('Gmail SMTP not configured, skipping email');
        }
      } catch (emailError) {
        console.error(`Failed to send email to ${recipient.email}:`, emailError);
      }

      results.push({ recipientId: recipient.recipientId, email: recipient.email, name: recipient.name, token, success: true, emailSent, signatureLink });

      // Créer une notification
      const { error: notifError } = await supabaseClient
        .from('notifications')
        .insert({
          user_id: recipient.userId,
          type: 'file_validation_request',
          title: 'Document à signer',
          message: `${uploadedByName} vous demande de signer "${documentName}"`,
          data: { documentId, projectId, signatureToken: token, signatureLink },
          is_read: false
        });

      if (notifError) {
        console.error('Error creating notification:', notifError);
      }
    }

    // Fermer la connexion SMTP
    if (smtpClient) {
      await smtpClient.close();
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-signature-request-email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
