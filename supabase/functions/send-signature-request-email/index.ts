import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = (Deno.env.get('FROM_EMAIL') || 'onboarding@resend.dev').trim();

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

const APP_URL = 'https://www.aps-construction.com';

const generateToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/[+/=]/g, '')
    .substring(0, 32);
};

function adjustColor(hex: string, amount: number): string {
  hex = hex.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(hex.substring(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.substring(2, 4), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.substring(4, 6), 16) + amount));
  return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
}

function buildSignatureEmail(vars: {
  recipientName: string;
  uploadedByName: string;
  documentName: string;
  projectName?: string;
  signatureLink: string;
  expiresAt: string;
}): string {
  const accent = '#2563eb';
  return [
    '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">',
    '<title>Document à signer</title></head>',
    '<body style="margin:0;padding:0;background-color:#f0f2f5;font-family:Arial,Helvetica,sans-serif;">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f2f5;padding:32px 16px;">',
    '<tr><td align="center">',

    // Container
    '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">',

    // Logo Bar
    '<tr><td style="padding:24px 32px;background:#ffffff;border-bottom:1px solid #f0f2f5;" align="left">',
    '<table role="presentation" cellpadding="0" cellspacing="0"><tr>',
    '<td style="width:40px;height:40px;background:' + accent + ';border-radius:10px;text-align:center;vertical-align:middle;" align="center">',
    '<span style="color:#ffffff;font-size:18px;font-weight:800;font-family:Arial,sans-serif;line-height:40px;">A</span></td>',
    '<td style="padding-left:12px;"><span style="font-family:Arial,sans-serif;font-size:20px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;">APS</span>',
    '<span style="font-family:Arial,sans-serif;font-size:11px;color:#94a3b8;display:block;line-height:1.2;letter-spacing:0.5px;">CONSTRUCTION</span></td>',
    '</tr></table></td></tr>',

    // Header
    '<tr><td style="background:linear-gradient(135deg,' + accent + ' 0%,' + adjustColor(accent, -25) + ' 100%);padding:36px 40px;" align="left">',
    '<table role="presentation" cellpadding="0" cellspacing="0"><tr>',
    '<td style="padding-right:16px;vertical-align:middle;"><span style="font-size:32px;line-height:1;">📄</span></td>',
    '<td><h1 style="margin:0;font-family:Arial,sans-serif;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;">Document à signer</h1>',
    '<p style="margin:4px 0 0 0;font-family:Arial,sans-serif;font-size:13px;color:rgba(255,255,255,0.8);">Signature électronique requise</p></td>',
    '</tr></table></td></tr>',

    // Body
    '<tr><td style="padding:36px 40px;">',
    '<p style="margin:0 0 20px 0;font-family:Arial,sans-serif;font-size:15px;color:#334155;line-height:1.6;">Bonjour <strong>' + vars.recipientName + '</strong>,</p>',
    '<p style="margin:0 0 24px 0;font-family:Arial,sans-serif;font-size:15px;color:#334155;line-height:1.6;"><strong>' + vars.uploadedByName + '</strong> vous demande de signer électroniquement un document' + (vars.projectName ? ' pour le projet <strong>' + vars.projectName + '</strong>' : '') + '.</p>',

    // Document Info Card
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;margin:0 0 24px 0;">',
    '<tr><td colspan="2" style="padding:16px 20px 8px 20px;font-family:Arial,sans-serif;font-size:13px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e2e8f0;">Détails du document</td></tr>',
    '<tr><td style="padding:12px 20px;font-family:Arial,sans-serif;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;width:120px;">Document</td>',
    '<td style="padding:12px 20px;font-family:Arial,sans-serif;font-size:14px;color:#0f172a;font-weight:600;">' + vars.documentName + '</td></tr>',
    (vars.projectName ? '<tr><td style="padding:8px 20px;font-family:Arial,sans-serif;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Projet</td><td style="padding:8px 20px;font-family:Arial,sans-serif;font-size:14px;color:#0f172a;font-weight:600;">' + vars.projectName + '</td></tr>' : ''),
    '<tr><td style="padding:8px 20px 12px 20px;font-family:Arial,sans-serif;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Envoyé par</td>',
    '<td style="padding:8px 20px 12px 20px;font-family:Arial,sans-serif;font-size:14px;color:#0f172a;font-weight:600;">' + vars.uploadedByName + '</td></tr>',
    '</table>',

    // CTA Button
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:8px 0 24px 0;">',
    '<a href="' + vars.signatureLink + '" style="display:inline-block;background:' + accent + ';color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:700;text-decoration:none;padding:16px 48px;border-radius:10px;letter-spacing:0.3px;box-shadow:0 4px 12px rgba(37,99,235,0.3);">Signer le document</a>',
    '</td></tr></table>',

    // Warning
    '<div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:16px 20px;border-radius:0 8px 8px 0;margin:0 0 24px 0;">',
    '<p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#92400e;line-height:1.6;">',
    '<strong>⚠️ Important :</strong> Ce lien est personnel et sécurisé. Ne le partagez pas. Il expire le <strong>' + vars.expiresAt + '</strong>.</p></div>',

    // Fallback link
    '<p style="margin:0;font-family:Arial,sans-serif;font-size:12px;color:#94a3b8;line-height:1.5;">Si le bouton ne fonctionne pas, copiez ce lien :<br>',
    '<a href="' + vars.signatureLink + '" style="color:#2563eb;word-break:break-all;font-size:12px;">' + vars.signatureLink + '</a></p>',
    '</td></tr>',

    // Footer
    '<tr><td style="padding:24px 40px;background:#f8fafc;border-top:1px solid #e2e8f0;">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>',
    '<td><p style="margin:0 0 4px 0;font-family:Arial,sans-serif;font-size:11px;color:#94a3b8;line-height:1.5;">Cet email a été envoyé automatiquement. Merci de ne pas y répondre.</p>',
    '<p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:#cbd5e1;">&copy; 2025 APS Construction &mdash; Tous droits r&eacute;serv&eacute;s</p></td>',
    '<td width="80" align="right" style="vertical-align:middle;">',
    '<a href="' + APP_URL + '" style="display:inline-block;width:32px;height:32px;background:' + accent + ';border-radius:8px;text-align:center;line-height:32px;text-decoration:none;">',
    '<span style="color:#ffffff;font-size:14px;font-weight:800;font-family:Arial,sans-serif;">A</span></a></td>',
    '</tr></table></td></tr>',

    '</table></td></tr></table></body></html>'
  ].join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: getCorsHeaders(req) });
  }

  try {
    const { recipients, documentName, projectName, uploadedByName, documentId, projectId } = await req.json();

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing recipients' }),
        { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    const appUrl = Deno.env.get('APP_URL') || APP_URL;
    const results = [];

    const sendEmail = async (to: string, subject: string, html: string) => {
      if (!RESEND_API_KEY) {
        console.log('RESEND_API_KEY not set, skipping email send');
        return { id: 'test-mode-no-api-key' };
      }
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({ from: FROM_EMAIL, to, subject, html })
      });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(`Failed to send email: ${error}`);
      }
      return await res.json();
    };

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

      const emailBody = buildSignatureEmail({
        recipientName: recipient.name,
        uploadedByName,
        documentName,
        projectName,
        signatureLink,
        expiresAt: expiresAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
      });

      let emailSent = false;
      try {
        if (recipient.email && RESEND_API_KEY) {
          await sendEmail(recipient.email, `Document à signer : ${documentName}`, emailBody);
          emailSent = true;
          console.log(`Email sent to ${recipient.email}`);
        }
      } catch (emailError) {
        console.error(`Failed to send email to ${recipient.email}:`, emailError);
      }

      results.push({
        recipientId: recipient.recipientId, email: recipient.email, name: recipient.name,
        token, success: true, emailSent, signatureLink
      });

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

      if (notifError) console.error('Error creating notification:', notifError);
    }

    return new Response(
      JSON.stringify({ success: true, message: `Signature requests sent to ${results.length} recipients`, results }),
      { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-signature-request-email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});
