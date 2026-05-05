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

// ──────────────────────────────────────────────────────────────────────────────
// Email "Document signé" — charte graphique APS Construction
// ──────────────────────────────────────────────────────────────────────────────
function buildSignedEmail(vars: {
  adminName: string;
  signerName: string;
  documentName: string;
  projectName: string;
  comment?: string;
  viewUrl: string;
}): string {
  const accent = '#065f46';

  const infoRows = [
    { label: 'Document', value: vars.documentName },
    ...(vars.projectName ? [{ label: 'Projet', value: vars.projectName }] : []),
    { label: 'Signé par', value: vars.signerName },
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

  const commentBlock = vars.comment
    ? [
        '<tr>',
        '  <td style="padding:16px 0 8px 0;">',
        '    <table role="presentation" cellpadding="0" cellspacing="0" width="100%"',
        '           style="background-color:#f8fafc; border-left:3px solid #94a3b8;',
        '                  border-radius:0 2px 2px 0;">',
        '      <tr>',
        '        <td style="padding:4px 12px 2px 12px; font-family:Arial,Helvetica,sans-serif;',
        '                   font-size:11px; font-weight:700; color:#64748b;',
        '                   text-transform:uppercase; letter-spacing:0.6px;">Commentaire</td>',
        '      </tr>',
        '      <tr>',
        '        <td style="padding:0 12px 12px 12px; font-family:Georgia,serif;',
        `                   font-size:14px; color:#374151; font-style:italic; line-height:1.7;">&laquo; ${vars.comment} &raquo;</td>`,
        '      </tr>',
        '    </table>',
        '  </td>',
        '</tr>',
      ].join('\n')
    : '';

  return [
    '<!DOCTYPE html>',
    '<html lang="fr">',
    '<head>',
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '  <title>Document signé — APS Construction</title>',
    '</head>',
    '<body style="margin:0; padding:0; background-color:#f4f4f5; font-family:Arial,Helvetica,sans-serif;">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"',
    '       style="background-color:#f4f4f5; padding:32px 16px;">',
    '  <tr><td align="center">',

    // Card
    '  <table role="presentation" width="600" cellpadding="0" cellspacing="0"',
    '         style="max-width:600px; width:100%; background:#ffffff;',
    '                border:1px solid #dde1e7; border-radius:2px;">',

    // Header bar
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
    '                           padding:4px 10px; border-radius:2px;">DOCUMENT</span>',
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
    '                   line-height:1.4;">Document signé avec succès</h1>',
    '        <p style="margin:6px 0 0 0; font-family:Arial,Helvetica,sans-serif;',
    '                  font-size:13px; color:rgba(255,255,255,0.85);">Signature électronique confirmée</p>',
    '      </td>',
    '    </tr>',

    // Body
    '    <tr>',
    '      <td style="padding:32px 32px 8px 32px;">',
    '        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">',
    '          <tr>',
    '            <td style="padding-bottom:16px; font-family:Arial,Helvetica,sans-serif;',
    `                       font-size:15px; color:#333333; line-height:1.6;">Bonjour ${vars.adminName},</td>`,
    '          </tr>',

    // Success notice
    '          <tr>',
    '            <td style="padding-bottom:20px;">',
    '              <table role="presentation" cellpadding="0" cellspacing="0" width="100%"',
    '                     style="background-color:#f0fdf4; border-left:3px solid #16a34a;',
    '                            border-radius:0 2px 2px 0;">',
    '                <tr>',
    '                  <td style="padding:12px 16px; font-family:Arial,Helvetica,sans-serif;',
    `                             font-size:14px; color:#166534; line-height:1.6;">`,
    `                    <strong>${vars.signerName}</strong> a signé électroniquement le document.`,
    '                  </td>',
    '                </tr>',
    '              </table>',
    '            </td>',
    '          </tr>',

    // Info table
    '          <tr>',
    '            <td>',
    '              <table role="presentation" cellpadding="0" cellspacing="0" width="100%"',
    `                     style="border:1px solid #e5e7eb; border-radius:2px; overflow:hidden;">`,
    tableRows,
    '              </table>',
    '            </td>',
    '          </tr>',

    // Comment block (optional)
    commentBlock,

    // CTA button
    '          <tr>',
    '            <td align="center" style="padding:32px 0 8px 0;">',
    `              <a href="${vars.viewUrl}"`,
    `                 style="display:inline-block; background-color:${accent};`,
    '                        color:#ffffff; font-family:Arial,Helvetica,sans-serif;',
    '                        font-size:14px; font-weight:700; letter-spacing:0.5px;',
    '                        text-decoration:none; padding:14px 40px; border-radius:4px;">',
    '                Voir le document',
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
    const { adminId, documentName, signerName, projectId, comment } = await req.json();

    if (!adminId || !documentName || !signerName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

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

    let projectName = '';
    if (projectId) {
      const { data: project } = await supabaseClient.from('projects').select('name').eq('id', projectId).single();
      projectName = project?.name || '';
    }

    const adminName = [admin.first_name, admin.last_name].filter(Boolean).join(' ') || 'Administrateur';
    const viewUrl = `${APP_URL}/dashboard/projets/${projectId || ''}`;

    const emailBody = buildSignedEmail({ adminName, signerName, documentName, projectName, comment, viewUrl });

    let emailSent = false;
    if (GMAIL_USER && GMAIL_APP_PASSWORD && admin.email) {
      try {
        const smtpClient = new SMTPClient({
          connection: { hostname: 'smtp.gmail.com', port: 465, tls: true, auth: { username: GMAIL_USER, password: GMAIL_APP_PASSWORD } },
        });
        await smtpClient.send({
          from: GMAIL_USER,
          to: admin.email,
          subject: `[APS Construction] Document signé : ${documentName}`,
          content: emailBody.replace(/<[^>]*>?/gm, ''),
          html: emailBody,
        });
        await smtpClient.close();
        emailSent = true;
      } catch (emailError) {
        console.error(`SMTP error:`, emailError);
      }
    }

    await supabaseClient.from('notifications').insert({
      user_id: adminId, type: 'document_signed', title: 'Document signé',
      message: `${signerName} a signé le document "${documentName}"${projectName ? ` pour le projet ${projectName}` : ''}`,
      data: { documentName, signerName, projectId, comment, emailSent }, is_read: false
    }).catch(e => console.error('Notification error:', e));

    return new Response(
      JSON.stringify({ success: true, message: 'Email notification sent', recipient: admin.email }),
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
