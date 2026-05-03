import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// Resend API pour envoyer des emails
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = (Deno.env.get('FROM_EMAIL') || 'onboarding@resend.dev').trim();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Générer un token aléatoire sécurisé
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

    // Créer le client Supabase avec la clé service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    const appUrl = Deno.env.get('APP_URL') || 'https://app.aps.com';
    const results = [];

    // Fonction pour envoyer un email via Resend
    const sendEmail = async (to: string, subject: string, html: string) => {
      if (!RESEND_API_KEY) {
        console.log('RESEND_API_KEY not set, skipping email send');
        return { id: 'test-mode-no-api-key' };
      }

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: to,
          subject: subject,
          html: html
        })
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(`Failed to send email: ${error}`);
      }

      return await res.json();
    };

    // Pour chaque destinataire, générer un token et envoyer l'email
    for (const recipient of recipients) {
      const token = generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expire dans 7 jours

      // Mettre à jour le document_recipient avec le token
      const { error: updateError } = await supabaseClient
        .from('document_recipients')
        .update({
          signature_token: token,
          token_expires_at: expiresAt.toISOString()
        })
        .eq('id', recipient.recipientId);

      if (updateError) {
        console.error('Error updating recipient:', updateError);
        results.push({
          recipientId: recipient.recipientId,
          success: false,
          error: 'Failed to generate token'
        });
        continue;
      }

      // Construire le lien de signature
      const signatureLink = `${appUrl}/signer/${token}`;

      // Préparer l'email
      const emailSubject = `Document à signer : ${documentName}`;
      const emailBody = `
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
</html>
      `;

      // Envoyer l'email via Resend
      let emailSent = false;
      try {
        if (recipient.email && RESEND_API_KEY) {
          await sendEmail(recipient.email, emailSubject, emailBody);
          emailSent = true;
          console.log(`Email sent to ${recipient.email}`);
        } else if (!RESEND_API_KEY) {
          console.log('RESEND_API_KEY not configured, email not sent');
        }
      } catch (emailError) {
        console.error(`Failed to send email to ${recipient.email}:`, emailError);
      }
      
      results.push({
        recipientId: recipient.recipientId,
        email: recipient.email,
        name: recipient.name,
        token: token,
        success: true,
        emailSent,
        signatureLink
      });

      // Créer une notification pour l'intervenant dans l'app
      const { error: notifError } = await supabaseClient
        .from('notifications')
        .insert({
          user_id: recipient.userId,
          type: 'file_validation_request',
          title: 'Document à signer',
          message: `${uploadedByName} vous demande de signer "${documentName}"`,
          data: {
            documentId,
            projectId,
            signatureToken: token,
            signatureLink
          },
          is_read: false
        });

      if (notifError) {
        console.error('Error creating notification:', notifError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Signature requests sent to ${results.length} recipients`,
        results
      }),
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
