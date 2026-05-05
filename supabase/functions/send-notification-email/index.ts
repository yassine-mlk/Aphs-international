import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

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

const GMAIL_USER = Deno.env.get('GMAIL_USER');
const GMAIL_APP_PASSWORD = Deno.env.get('GMAIL_APP_PASSWORD');

const APP_URL = 'https://www.aps-construction.com';
const LOGO_URL = `${APP_URL}/logo.png`;

// ──────────────────────────────────────────────────────────────
// PROFESSIONAL EMAIL TEMPLATE SYSTEM
// Uses table-based layout for maximum email client compatibility
// All styles are inline to avoid =20 encoding artifacts
// ──────────────────────────────────────────────────────────────

function buildEmail(opts: {
  icon: string;
  accentColor: string;
  title: string;
  greeting?: string;
  body: string;
  buttonText?: string;
  buttonUrl?: string;
  footerNote?: string;
}): string {
  const { icon, accentColor, title, greeting, body, buttonText, buttonUrl, footerNote } = opts;

  const buttonBlock = buttonText && buttonUrl
    ? `<tr><td style="padding:24px 0 0 0;" align="center"><a href="${buttonUrl}" style="display:inline-block;background:${accentColor};color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:8px;letter-spacing:0.3px;">${buttonText}</a></td></tr>`
    : '';

  const footerText = footerNote || 'Cet email a été envoyé automatiquement. Merci de ne pas y répondre.';

  // Build HTML as compact string to avoid quoted-printable =20 artifacts
  return [
    '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">',
    '<title>' + title + '</title></head>',
    '<body style="margin:0;padding:0;background-color:#f0f2f5;font-family:Arial,Helvetica,sans-serif;">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f2f5;padding:32px 16px;">',
    '<tr><td align="center">',

    // Container
    '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">',

    // Logo Bar
    '<tr><td style="padding:24px 32px;background:#ffffff;border-bottom:1px solid #f0f2f5;" align="left">',
    '<table role="presentation" cellpadding="0" cellspacing="0"><tr>',
    '<td style="width:40px;height:40px;background:' + accentColor + ';border-radius:10px;text-align:center;vertical-align:middle;" align="center">',
    '<span style="color:#ffffff;font-size:18px;font-weight:800;font-family:Arial,sans-serif;line-height:40px;">A</span></td>',
    '<td style="padding-left:12px;"><span style="font-family:Arial,sans-serif;font-size:20px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;">APS</span>',
    '<span style="font-family:Arial,sans-serif;font-size:11px;color:#94a3b8;display:block;line-height:1.2;letter-spacing:0.5px;">CONSTRUCTION</span></td>',
    '</tr></table></td></tr>',

    // Header Banner
    '<tr><td style="background:linear-gradient(135deg,' + accentColor + ' 0%,' + adjustColor(accentColor, -25) + ' 100%);padding:36px 40px;" align="left">',
    '<table role="presentation" cellpadding="0" cellspacing="0"><tr>',
    '<td style="padding-right:16px;vertical-align:middle;"><span style="font-size:32px;line-height:1;">' + icon + '</span></td>',
    '<td><h1 style="margin:0;font-family:Arial,sans-serif;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;">' + title + '</h1></td>',
    '</tr></table></td></tr>',

    // Body
    '<tr><td style="padding:36px 40px;">',
    '<p style="margin:0 0 20px 0;font-family:Arial,sans-serif;font-size:15px;color:#334155;line-height:1.6;">' + (greeting || 'Bonjour,') + '</p>',
    body,
    buttonBlock,
    '</td></tr>',

    // Footer
    '<tr><td style="padding:24px 40px;background:#f8fafc;border-top:1px solid #e2e8f0;">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>',
    '<td><p style="margin:0 0 4px 0;font-family:Arial,sans-serif;font-size:11px;color:#94a3b8;line-height:1.5;">' + footerText + '</p>',
    '<p style="margin:0;font-family:Arial,sans-serif;font-size:11px;color:#cbd5e1;">&copy; 2025 APS Construction &mdash; Tous droits r&eacute;serv&eacute;s</p></td>',
    '<td width="80" align="right" style="vertical-align:middle;">',
    '<a href="' + APP_URL + '" style="display:inline-block;width:32px;height:32px;background:' + accentColor + ';border-radius:8px;text-align:center;line-height:32px;text-decoration:none;">',
    '<span style="color:#ffffff;font-size:14px;font-weight:800;font-family:Arial,sans-serif;">A</span></a></td>',
    '</tr></table></td></tr>',

    '</table>',
    '</td></tr></table></body></html>'
  ].join('');
}

// Darken/lighten a hex color
function adjustColor(hex: string, amount: number): string {
  hex = hex.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(hex.substring(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.substring(2, 4), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.substring(4, 6), 16) + amount));
  return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
}

function infoCard(rows: { label: string; value: string }[]): string {
  const inner = rows.map(r =>
    '<tr><td style="padding:8px 16px;font-family:Arial,sans-serif;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">' + r.label + '</td>' +
    '<td style="padding:8px 16px;font-family:Arial,sans-serif;font-size:14px;color:#0f172a;font-weight:600;">' + r.value + '</td></tr>'
  ).join('');
  return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;margin:20px 0;">' + inner + '</table>';
}

function alertBox(text: string, type: 'success' | 'warning' | 'error' | 'info'): string {
  const colors = { success: { bg: '#f0fdf4', border: '#22c55e', text: '#166534' }, warning: { bg: '#fffbeb', border: '#f59e0b', text: '#92400e' }, error: { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' }, info: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' } };
  const c = colors[type];
  return '<div style="background:' + c.bg + ';border-left:4px solid ' + c.border + ';padding:16px 20px;border-radius:0 8px 8px 0;margin:20px 0;font-family:Arial,sans-serif;font-size:14px;color:' + c.text + ';line-height:1.6;">' + text + '</div>';
}

// ──────────────────────────────────────────────────────────────
// EMAIL TEMPLATES
// ──────────────────────────────────────────────────────────────

const emailTemplates: Record<string, (vars: Record<string, string>) => { subject: string; html: string }> = {

  task_assigned: (vars) => ({
    subject: `Nouvelle tâche assignée : ${vars.taskName}`,
    html: buildEmail({
      icon: '📋', accentColor: '#2563eb', title: 'Nouvelle tâche assignée',
      body: '<p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:15px;color:#334155;line-height:1.6;">Une nouvelle tâche vous a été assignée. Veuillez consulter les détails ci-dessous :</p>' +
        infoCard([
          { label: 'Tâche', value: vars.taskName },
          { label: 'Projet', value: vars.projectName },
          { label: 'Assignée par', value: vars.assignedByName },
          ...(vars.dueDate && vars.dueDate !== 'Non définie' ? [{ label: 'Échéance', value: vars.dueDate }] : [])
        ]),
      buttonText: 'Accéder à mon espace', buttonUrl: vars.appUrl || APP_URL
    })
  }),

  task_validated: (vars) => ({
    subject: `Tâche validée : ${vars.taskName}`,
    html: buildEmail({
      icon: '✅', accentColor: '#22c55e', title: 'Tâche validée',
      body: alertBox('<strong>Bonne nouvelle !</strong> La tâche <strong>&laquo; ' + vars.taskName + ' &raquo;</strong> du projet <strong>' + vars.projectName + '</strong> a été validée par ' + vars.actorName + '.', 'success') +
        '<p style="margin:16px 0 0 0;font-family:Arial,sans-serif;font-size:15px;color:#334155;line-height:1.6;">Vous pouvez consulter les détails dans votre espace.</p>',
      buttonText: 'Voir la tâche', buttonUrl: vars.appUrl || APP_URL
    })
  }),

  member_added: (vars) => ({
    subject: `Bienvenue dans le projet ${vars.projectName}`,
    html: buildEmail({
      icon: '🎉', accentColor: '#7c3aed', title: 'Bienvenue dans le projet',
      body: '<p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:15px;color:#334155;line-height:1.6;">Vous avez été ajouté à un nouveau projet. Voici les informations :</p>' +
        infoCard([
          { label: 'Projet', value: vars.projectName },
          { label: 'Ajouté par', value: vars.addedByName },
          { label: 'Votre rôle', value: vars.role }
        ]) +
        '<p style="margin:16px 0 0 0;font-family:Arial,sans-serif;font-size:15px;color:#334155;line-height:1.6;">Connectez-vous pour accéder au projet et commencer à collaborer.</p>',
      buttonText: 'Accéder au projet', buttonUrl: vars.appUrl || APP_URL
    })
  }),

  message_received: (vars) => ({
    subject: `Nouveau message de ${vars.senderName}`,
    html: buildEmail({
      icon: '💬', accentColor: '#f59e0b', title: 'Nouveau message',
      body: '<p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:15px;color:#334155;line-height:1.6;">Vous avez reçu un nouveau message de <strong>' + vars.senderName + '</strong> :</p>' +
        '<div style="background:#fefce8;padding:20px 24px;border-radius:12px;margin:16px 0;border:1px solid #fef08a;">' +
        '<p style="margin:0;font-family:Georgia,serif;font-size:15px;color:#713f12;line-height:1.7;font-style:italic;">&laquo; ' + vars.messagePreview + ' &raquo;</p></div>',
      buttonText: 'Voir le message', buttonUrl: (vars.appUrl || APP_URL) + '/dashboard/messages'
    })
  }),

  workflow_status_changed: (vars) => ({
    subject: `Tâche ${vars.status} : ${vars.taskName}`,
    html: buildEmail({
      icon: vars.status === 'validée' ? '✅' : vars.status === 'refusée' ? '❌' : '⏳',
      accentColor: vars.status === 'validée' ? '#22c55e' : vars.status === 'refusée' ? '#ef4444' : '#f59e0b',
      title: 'Tâche ' + vars.status,
      body: alertBox('La tâche <strong>&laquo; ' + vars.taskName + ' &raquo;</strong> du projet <strong>' + vars.projectName + '</strong> a été <strong>' + vars.status + '</strong> par ' + vars.actorName + '.', vars.status === 'validée' ? 'success' : vars.status === 'refusée' ? 'error' : 'warning') +
        '<p style="margin:16px 0 0 0;font-family:Arial,sans-serif;font-size:15px;color:#334155;line-height:1.6;">Connectez-vous pour voir les détails.</p>',
      buttonText: 'Voir les détails', buttonUrl: vars.appUrl || APP_URL
    })
  }),

  signature_confirmed: (vars) => ({
    subject: `Document signé : ${vars.documentName}`,
    html: buildEmail({
      icon: '✍️', accentColor: '#059669', title: 'Document signé électroniquement',
      body: alertBox('<strong>' + vars.signerName + '</strong> a signé le document avec succès.', 'success') +
        infoCard([
          { label: 'Document', value: vars.documentName },
          { label: 'Projet', value: vars.projectName },
          { label: 'Signé par', value: vars.signerName }
        ]) +
        '<p style="margin:16px 0 0 0;font-family:Arial,sans-serif;font-size:14px;color:#64748b;line-height:1.6;">Cette signature électronique a été enregistrée et horodatée dans le système.</p>',
      buttonText: 'Voir le document', buttonUrl: vars.appUrl || APP_URL
    })
  }),

  meeting_request: (vars) => ({
    subject: `Demande de visioconférence : ${vars.subject}`,
    html: buildEmail({
      icon: '📹', accentColor: '#2563eb', title: 'Demande de visioconférence',
      body: '<p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:15px;color:#334155;line-height:1.6;"><strong>' + vars.intervenantName + '</strong> souhaite organiser une réunion en visioconférence.</p>' +
        infoCard([
          { label: 'Objet', value: vars.subject },
          { label: 'Date souhaitée', value: vars.dateText }
        ]),
      buttonText: 'Gérer la demande', buttonUrl: vars.link || APP_URL + '/dashboard/videoconference?tab=pending'
    })
  }),

  meeting_reminder: (vars) => ({
    subject: `Rappel : Visioconférence "${vars.title}"`,
    html: buildEmail({
      icon: '📅', accentColor: '#6366f1', title: 'Rappel de visioconférence',
      body: alertBox('Votre réunion commence bientôt. Assurez-vous d\'être disponible.', 'info') +
        infoCard([
          { label: 'Réunion', value: vars.title },
          { label: 'Date', value: vars.dateText }
        ]),
      buttonText: 'Rejoindre la réunion', buttonUrl: vars.link || APP_URL + '/dashboard/videoconference'
    })
  }),

  meeting_accepted: (vars) => ({
    subject: `Demande acceptée : ${vars.subject}`,
    html: buildEmail({
      icon: '✅', accentColor: '#22c55e', title: 'Demande acceptée',
      body: alertBox('Votre demande de visioconférence a été <strong>acceptée</strong>.', 'success') +
        infoCard([
          { label: 'Objet', value: vars.subject },
          { label: 'Date confirmée', value: vars.dateText }
        ]),
      buttonText: 'Voir mes réunions', buttonUrl: vars.link || APP_URL + '/dashboard/videoconference'
    })
  }),

  meeting_refused: (vars) => ({
    subject: `Demande refusée : ${vars.subject}`,
    html: buildEmail({
      icon: '❌', accentColor: '#ef4444', title: 'Demande refusée',
      body: alertBox('Votre demande de visioconférence a été <strong>refusée</strong>.', 'error') +
        infoCard([
          { label: 'Objet', value: vars.subject },
          { label: 'Raison', value: vars.reason || 'Non spécifiée' }
        ]) +
        '<p style="margin:16px 0 0 0;font-family:Arial,sans-serif;font-size:15px;color:#334155;line-height:1.6;">Vous pouvez soumettre une nouvelle demande avec d\'autres créneaux.</p>',
    })
  }),

  generic_notification: (vars) => ({
    subject: vars.subject || vars.title || 'Nouvelle notification APS',
    html: buildEmail({
      icon: '🔔', accentColor: '#2563eb', title: vars.title || 'Notification',
      body: '<p style="margin:0 0 16px 0;font-family:Arial,sans-serif;font-size:15px;color:#334155;line-height:1.6;">' + (vars.message || '') + '</p>',
      buttonText: vars.link ? 'Voir sur mon espace' : undefined,
      buttonUrl: vars.link ? (vars.appUrl || APP_URL) + vars.link : undefined
    })
  }),
};

// ──────────────────────────────────────────────────────────────
// MAIN HANDLER
// ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: getCorsHeaders(req) });
  }

  try {
    const { to, subject, template, variables } = await req.json();

    if (!to || !template) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    const templateFn = emailTemplates[template];
    if (!templateFn) {
      return new Response(
        JSON.stringify({ error: 'Unknown template' }),
        { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    const emailContent = templateFn(variables || {});

    if (GMAIL_USER && GMAIL_APP_PASSWORD) {
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
          to: to,
          subject: subject || emailContent.subject,
          content: 'auto',
          html: emailContent.html,
          encoding: 'base64',
        });

        await smtpClient.close();
        console.log(`Email sent to ${to} with template ${template}`);
      } catch (smtpError) {
        console.error('SMTP Error:', smtpError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Email processed' }),
      { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});
