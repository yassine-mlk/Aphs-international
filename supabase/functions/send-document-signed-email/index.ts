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

const APP_URL = 'https://www.aps-construction.com';

function adjustColor(hex: string, amount: number): string {
  hex = hex.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(hex.substring(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.substring(2, 4), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.substring(4, 6), 16) + amount));
  return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
}

function buildSignedNotificationEmail(vars: {
  adminName: string;
  signerName: string;
  documentName: string;
  projectName: string;
  comment?: string;
  viewUrl: string;
}): string {
  const accent = '#059669';
  const commentBlock = vars.comment
    ? '<div style="background:#fefce8;padding:16px 20px;border-radius:8px;border:1px solid #fef08a;margin:16px 0;"><p style="margin:0 0 4px 0;font-family:Arial,sans-serif;font-size:12px;color:#92400e;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Commentaire du signataire</p><p style="margin:0;font-family:Georgia,serif;font-size:14px;color:#713f12;line-height:1.7;font-style:italic;">&laquo; ' + vars.comment + ' &raquo;</p></div>'
    : '';

  return [
    '<!DOCTYPE html>',
    '<html lang="fr">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1.0">',
    '<title>Document signé</title>',
    '</head>',
    '<body style="margin:0;padding:0;background-color:#f0f2f5;font-family:Arial,Helvetica,sans-serif;">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f2f5;padding:32px 16px;">',
    '<tr><td align="center">',
    '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">',

    // Logo
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
    '<td style="padding-right:16px;vertical-align:middle;"><span style="font-size:32px;line-height:1;">✍️</span></td>',
    '<td><h1 style="margin:0;font-family:Arial,sans-serif;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;">Document signé</h1>',
    '<p style="margin:4px 0 0 0;font-family:Arial,sans-serif;font-size:13px;color:rgba(255,255,255,0.8);">Signature électronique confirmée</p></td>',
    '</tr></table></td></tr>',

    // Body
    '<tr><td style="padding:36px 40px;">',
    '<p style="margin:0 0 20px 0;font-family:Arial,sans-serif;font-size:15px;color:#334155;line-height:1.6;">Bonjour <strong>' + vars.adminName + '</strong>,</p>',

    // Success alert
    '<div style="background:#f0fdf4;border-left:4px solid #22c55e;padding:16px 20px;border-radius:0 8px 8px 0;margin:0 0 20px 0;"><p style="margin:0;font-family:Arial,sans-serif;font-size:14px;color:#166534;line-height:1.6;"><strong>' + vars.signerName + '</strong> a signé électroniquement le document avec succès.</p></div>',

    // Info card
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;margin:0 0 20px 0;">',
    '<tr><td style="padding:12px 20px;font-family:Arial,sans-serif;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;width:120px;">Document</td>',
    '<td style="padding:12px 20px;font-family:Arial,sans-serif;font-size:14px;color:#0f172a;font-weight:600;">' + vars.documentName + '</td></tr>',
    (vars.projectName ? '<tr><td style="padding:8px 20px;font-family:Arial,sans-serif;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Projet</td><td style="padding:8px 20px;font-family:Arial,sans-serif;font-size:14px;color:#0f172a;font-weight:600;">' + vars.projectName + '</td></tr>' : ''),
    '<tr><td style="padding:8px 20px 12px 20px;font-family:Arial,sans-serif;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Signé par</td>',
    '<td style="padding:8px 20px 12px 20px;font-family:Arial,sans-serif;font-size:14px;color:#0f172a;font-weight:600;">' + vars.signerName + '</td></tr>',
    '</table>',

    commentBlock,

    // Button
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:8px 0 0 0;">',
    '<a href="' + vars.viewUrl + '" style="display:inline-block;background:' + accent + ';color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:8px;">Voir le document</a>',
    '</td></tr></table>',
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

    '</table></td></tr></table>',
    '</body>',
    '</html>'
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

    const emailBody = buildSignedNotificationEmail({
      adminName, signerName, documentName, projectName, comment, viewUrl
    });

    let emailSent = false;
    if (GMAIL_USER && GMAIL_APP_PASSWORD && admin.email) {
      try {
        const smtpClient = new SMTPClient({
          connection: { hostname: 'smtp.gmail.com', port: 465, tls: true, auth: { username: GMAIL_USER, password: GMAIL_APP_PASSWORD } },
        });
        await smtpClient.send({
          from: GMAIL_USER, to: admin.email,
          subject: (`Document signé - ${documentName}`).replace(/\r?\n|\r/g, ' '),
          content: emailBody.replace(/<[^>]*>?/gm, ''), html: emailBody,
        });
        await smtpClient.close();
        emailSent = true;
        console.log(`Email sent to ${admin.email} via Gmail`);
      } catch (emailError) {
        console.error(`Failed to send email to ${admin.email}:`, emailError);
      }
    }

    const { error: notifError } = await supabaseClient.from('notifications').insert({
      user_id: adminId, type: 'document_signed', title: 'Document signé',
      message: `${signerName} a signé le document "${documentName}"${projectName ? ` pour le projet ${projectName}` : ''}`,
      data: { documentName, signerName, projectId, comment, emailSent }, is_read: false
    });
    if (notifError) console.error('Error creating notification:', notifError);

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
