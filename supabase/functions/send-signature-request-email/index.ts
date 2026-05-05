import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';
import { LOGO_B64 } from '../_shared/logo-b64.ts';

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

const APP_URL = 'https://www.aps-construction.com';

const generateToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/[+/=]/g, '')
    .substring(0, 32);
};

// ──────────────────────────────────────────────────────────────────────────────
// Gabarit email signature électronique — même charte graphique
// ──────────────────────────────────────────────────────────────────────────────
function buildSignatureEmail(vars: {
  recipientName: string;
  uploadedByName: string;
  documentName: string;
  projectName?: string;
  signatureLink: string;
  expiresAt: string;
}): string {
  const accent = '#1e40af';

  const infoRows = [
    { label: 'Document', value: vars.documentName },
    ...(vars.projectName ? [{ label: 'Projet', value: vars.projectName }] : []),
    { label: 'Demandé par', value: vars.uploadedByName },
    { label: 'Expire le', value: vars.expiresAt },
  ];

  const tableRows = infoRows.map(r =>
    `<tr>
  <td style="padding:10px 16px; font-family:Arial,Helvetica,sans-serif;
             font-size:11px; font-weight:700; color:#6b7280;
             text-transform:uppercase; letter-spacing:0.6px;
             border-right:2px solid ${accent}; width:120px;
             vertical-align:top;">${r.label}</td>
  <td style="padding:10px 16px; font-family:Arial,Helvetica,sans-serif;
             font-size:14px; color:#111827; vertical-align:top;">${r.value}</td>
</tr>
<tr><td colspan="2" style="padding:0; border-top:1px solid #f3f4f6;"></td></tr>`
  ).join('\n');

  return [
    '<!DOCTYPE html>',
    '<html lang="fr">',
    '<head>',
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '  <title>Document à signer — APS Construction</title>',
    '</head>',
    '<body style="margin:0; padding:0; background-color:#f4f4f5; font-family:Arial,Helvetica,sans-serif;">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"',
    '       style="background-color:#f4f4f5; padding:32px 16px;">',
    '  <tr><td align="center">',

    // Card
    '  <table role="presentation" width="600" cellpadding="0" cellspacing="0"',
    '         style="max-width:600px; width:100%; background:#ffffff;',
    '                border:1px solid #dde1e7; border-radius:2px;">',

    // Header bar — logo
    '    <tr>',
    `      <td style="padding:20px 32px; border-bottom:3px solid ${accent};">`,
    '        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">',
    '          <tr>',
    '            <td width="44" valign="middle">',
    `              <img src="${LOGO_B64}" alt="APS" width="44" height="44"`,
    '                   style="display:block; border:0; width:44px; height:44px; object-fit:contain;">',
    '            </td>',
    '            <td valign="middle" style="padding-left:12px;">',
    '              <span style="font-family:Arial,Helvetica,sans-serif; font-size:18px;',
    '                           font-weight:800; color:#1a1a2e;">APS</span>',
    '              <span style="font-family:Arial,Helvetica,sans-serif; font-size:18px;',
    '                           font-weight:400; color:#1a1a2e;"> Construction</span>',
    '            </td>',
    '            <td align="right" valign="middle">',
    `              <span style="display:inline-block; background-color:${accent};`,
    '                           color:#ffffff; font-family:Arial,Helvetica,sans-serif;',
    '                           font-size:10px; font-weight:700; letter-spacing:1px;',
    '                           padding:4px 10px; border-radius:2px;">SIGNATURE</span>',
    '            </td>',
    '          </tr>',
    '        </table>',
    '      </td>',
    '    </tr>',

    // Title band
    '    <tr>',
    `      <td style="background-color:${accent}; padding:24px 32px;">`,
    '        <h1 style="margin:0; font-family:Arial,Helvetica,sans-serif;',
    '                   font-size:20px; font-weight:700; color:#ffffff;',
    '                   line-height:1.4;">Document à signer</h1>',
    '        <p style="margin:6px 0 0 0; font-family:Arial,Helvetica,sans-serif;',
    '                  font-size:13px; color:rgba(255,255,255,0.85);">Signature électronique requise</p>',
    '      </td>',
    '    </tr>',

    // Body
    '    <tr>',
    '      <td style="padding:32px 32px 8px 32px;">',
    '        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">',
    '          <tr>',
    '            <td style="padding-bottom:16px; font-family:Arial,Helvetica,sans-serif;',
    `                       font-size:15px; color:#333333; line-height:1.6;">Bonjour ${vars.recipientName},</td>`,
    '          </tr>',
    '          <tr>',
    '            <td style="font-family:Arial,Helvetica,sans-serif; font-size:15px;',
    `                       color:#333333; line-height:1.7;"><strong>${vars.uploadedByName}</strong> `,
    `                       vous demande de signer électroniquement un document`,
    vars.projectName ? ` pour le projet <strong>${vars.projectName}</strong>` : '',
    '                       .</td>',
    '          </tr>',

    // Info table
    '          <tr>',
    '            <td style="padding-top:20px;">',
    '              <table role="presentation" cellpadding="0" cellspacing="0" width="100%"',
    `                     style="border:1px solid #e5e7eb; border-radius:2px; overflow:hidden;">`,
    tableRows,
    '              </table>',
    '            </td>',
    '          </tr>',

    // CTA button
    '          <tr>',
    '            <td align="center" style="padding:32px 0 8px 0;">',
    `              <a href="${vars.signatureLink}"`,
    `                 style="display:inline-block; background-color:${accent};`,
    '                        color:#ffffff; font-family:Arial,Helvetica,sans-serif;',
    '                        font-size:14px; font-weight:700; letter-spacing:0.5px;',
    '                        text-decoration:none; padding:14px 40px; border-radius:4px;">',
    '                Signer le document',
    '              </a>',
    '            </td>',
    '          </tr>',

    // Warning note
    '          <tr>',
    '            <td style="padding-top:16px; padding-bottom:8px;">',
    '              <table role="presentation" cellpadding="0" cellspacing="0" width="100%"',
    '                     style="background-color:#fffbeb; border-left:3px solid #f59e0b;',
    '                            border-radius:0 2px 2px 0;">',
    '                <tr>',
    '                  <td style="padding:12px 16px; font-family:Arial,Helvetica,sans-serif;',
    `                             font-size:13px; color:#92400e; line-height:1.6;">`,
    `                    <strong>Important :</strong> Ce lien est personnel et sécurisé.`,
    `                    Ne le partagez pas. Il expire le <strong>${vars.expiresAt}</strong>.`,
    '                  </td>',
    '                </tr>',
    '              </table>',
    '            </td>',
    '          </tr>',

    // Fallback link
    '          <tr>',
    '            <td style="padding-top:8px; font-family:Arial,Helvetica,sans-serif;',
    '                       font-size:12px; color:#9ca3af; line-height:1.5;">',
    '              Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>',
    `              <a href="${vars.signatureLink}" style="color:${accent}; word-break:break-all;">`,
    `                ${vars.signatureLink}`,
    '              </a>',
    '            </td>',
    '          </tr>',

    '        </table>',
    '      </td>',
    '    </tr>',

    // Divider
    '    <tr>',
    '      <td style="padding:24px 32px 0 32px;">',
    '        <hr style="border:none; border-top:1px solid #e5e7eb; margin:0;">',
    '      </td>',
    '    </tr>',

    // Footer
    '    <tr>',
    '      <td style="padding:20px 32px 28px 32px;">',
    '        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">',
    '          <tr>',
    '            <td>',
    '              <p style="margin:0 0 4px 0; font-family:Arial,Helvetica,sans-serif;',
    '                         font-size:11px; color:#9ca3af;">',
    '                Cet email a &eacute;t&eacute; g&eacute;n&eacute;r&eacute; automatiquement &mdash; Merci de ne pas y r&eacute;pondre.',
    '              </p>',
    `              <p style="margin:0; font-family:Arial,Helvetica,sans-serif;`,
    `                         font-size:11px; color:#d1d5db;">`,
    `                &copy; ${new Date().getFullYear()} APS Construction &mdash; Tous droits r&eacute;serv&eacute;s`,
    `              </p>`,
    '            </td>',
    `            <td align="right" valign="middle" style="padding-left:16px;">`,
    `              <a href="${APP_URL}" style="font-family:Arial,Helvetica,sans-serif;`,
    `                                          font-size:11px; color:${accent};`,
    `                                          text-decoration:none;">`,
    `                Accéder au portail`,
    `              </a>`,
    `            </td>`,
    '          </tr>',
    '        </table>',
    '      </td>',
    '    </tr>',

    '  </table>',
    '  </td></tr>',
    '</table>',
    '</body>',
    '</html>',
  ].join('\n');
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

    const results = [];

    const sendEmail = async (to: string, subject: string, html: string) => {
      if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
        console.warn('GMAIL credentials not set — email not sent');
        return;
      }
      const smtpClient = new SMTPClient({
        connection: {
          hostname: 'smtp.gmail.com',
          port: 465,
          tls: true,
          auth: { username: GMAIL_USER, password: GMAIL_APP_PASSWORD },
        },
      });
      await smtpClient.send({
        from: GMAIL_USER,
        to: to,
        subject: subject.replace(/\r?\n|\r/g, ' '),
        content: html.replace(/<[^>]*>?/gm, ''),
        html: html,
      });
      await smtpClient.close();
    };

    for (const recipient of recipients) {
      const token = generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { error: updateError } = await supabaseClient
        .from('document_recipients')
        .update({ signature_token: token, token_expires_at: expiresAt.toISOString() })
        .eq('id', recipient.recipientId);

      if (updateError) {
        console.error('Error updating recipient:', updateError);
        results.push({ recipientId: recipient.recipientId, success: false, error: 'Failed to generate token' });
        continue;
      }

      const signatureLink = `${APP_URL}/signer/${token}`;
      const expiresFormatted = expiresAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

      const emailBody = buildSignatureEmail({
        recipientName: recipient.name,
        uploadedByName,
        documentName,
        projectName,
        signatureLink,
        expiresAt: expiresFormatted,
      });

      let emailSent = false;
      try {
        if (recipient.email) {
          await sendEmail(
            recipient.email,
            `[APS Construction] Document à signer : ${documentName}`,
            emailBody
          );
          emailSent = true;
        }
      } catch (emailError) {
        console.error(`Failed to send email to ${recipient.email}:`, emailError);
      }

      results.push({ recipientId: recipient.recipientId, email: recipient.email, success: true, emailSent, signatureLink, token });

      await supabaseClient.from('notifications').insert({
        user_id: recipient.userId,
        type: 'file_validation_request',
        title: 'Document à signer',
        message: `${uploadedByName} vous demande de signer "${documentName}"`,
        data: { documentId, projectId, signatureToken: token, signatureLink },
        is_read: false
      }).catch(e => console.error('Notification error:', e));
    }

    return new Response(
      JSON.stringify({ success: true, message: `Signature requests sent to ${results.length} recipients`, results }),
      { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-signature-request-email:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});
