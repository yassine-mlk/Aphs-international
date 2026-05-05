import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';
import { LOGO_B64 } from '../_shared/logo-b64.ts';

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
// Logo intégré en base64 — s'affiche même si Gmail bloque les images distantes
const LOGO_SRC = LOGO_B64;

// ──────────────────────────────────────────────────────────────────────────────
// GABARIT D'EMAIL PROFESSIONNEL — APS Construction
// • Mise en page par tableaux (compatible Outlook, Gmail, Apple Mail, mobile)
// • Styles inline uniquement (pas de <style> global qui serait supprimé)
// • Ruptures de lignes (\n) dans le HTML pour éviter les =20 en quoted-printable
// • Logo réel depuis le site, avec texte de remplacement lisible
// ──────────────────────────────────────────────────────────────────────────────

function buildEmail(opts: {
  accentColor: string;
  badgeText: string;       // ex: "TÂCHE", "RÉUNION", "DOCUMENT"
  title: string;
  subtitle?: string;
  greeting?: string;
  body: string;
  buttonText?: string;
  buttonUrl?: string;
  footerNote?: string;
}): string {
  const { accentColor, badgeText, title, subtitle, greeting, body, buttonText, buttonUrl, footerNote } = opts;

  const btnRow = buttonText && buttonUrl
    ? [
        '<tr>',
        '  <td align="center" style="padding:32px 0 8px 0;">',
        `    <a href="${buttonUrl}"`,
        `       style="display:inline-block;`,
        `              background-color:${accentColor};`,
        `              color:#ffffff;`,
        `              font-family:Arial,Helvetica,sans-serif;`,
        `              font-size:14px;`,
        `              font-weight:700;`,
        `              letter-spacing:0.5px;`,
        `              text-decoration:none;`,
        `              padding:14px 40px;`,
        `              border-radius:4px;">`,
        `      ${buttonText}`,
        '    </a>',
        '  </td>',
        '</tr>',
      ].join('\n')
    : '';

  const footer = footerNote || 'Cet email a &eacute;t&eacute; g&eacute;n&eacute;r&eacute; automatiquement &mdash; Merci de ne pas y r&eacute;pondre.';

  const lines = [
    '<!DOCTYPE html>',
    '<html lang="fr">',
    '<head>',
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
    `  <title>${title}</title>`,
    '</head>',
    '<body style="margin:0; padding:0; background-color:#f4f4f5; font-family:Arial,Helvetica,sans-serif;">',

    // Outer wrapper
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"',
    '       style="background-color:#f4f4f5; padding:32px 16px;">',
    '  <tr>',
    '    <td align="center">',

    // Card container — max 600px
    '      <table role="presentation" width="600" cellpadding="0" cellspacing="0"',
    '             style="max-width:600px; width:100%; background:#ffffff;',
    '                    border:1px solid #dde1e7; border-radius:2px;">',

    // ── HEADER BAR (logo + brand name) ──────────────────────────────────────
    '        <tr>',
    '          <td style="padding:20px 32px; border-bottom:3px solid ' + accentColor + ';">',
    '            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">',
    '              <tr>',
    // Logo image (avec texte alternatif si bloquée)
    '                <td width="44" valign="middle">',
    `                  <img src="${LOGO_SRC}"`,
    '                       alt="APS" width="44" height="44"',
    '                       style="display:block; border:0; width:44px; height:44px; object-fit:contain;">',
    '                </td>',
    // Brand name text
    '                <td valign="middle" style="padding-left:12px;">',
    '                  <span style="font-family:Arial,Helvetica,sans-serif;',
    '                               font-size:18px; font-weight:800;',
    '                               color:#1a1a2e; letter-spacing:-0.3px;">APS</span>',
    '                  <span style="font-family:Arial,Helvetica,sans-serif;',
    '                               font-size:18px; font-weight:400;',
    '                               color:#1a1a2e;"> Construction</span>',
    '                </td>',
    // Badge (type de notification)
    '                <td align="right" valign="middle">',
    `                  <span style="display:inline-block;`,
    `                               background-color:${accentColor};`,
    `                               color:#ffffff;`,
    `                               font-family:Arial,Helvetica,sans-serif;`,
    `                               font-size:10px; font-weight:700;`,
    `                               letter-spacing:1px;`,
    `                               padding:4px 10px;`,
    `                               border-radius:2px;">${badgeText}</span>`,
    '                </td>',
    '              </tr>',
    '            </table>',
    '          </td>',
    '        </tr>',

    // ── TITLE BAND ───────────────────────────────────────────────────────────
    '        <tr>',
    `          <td style="background-color:${accentColor}; padding:24px 32px;">`,
    `            <h1 style="margin:0; font-family:Arial,Helvetica,sans-serif;`,
    `                       font-size:20px; font-weight:700; color:#ffffff;`,
    `                       line-height:1.4;">${title}</h1>`,
    subtitle
      ? `            <p style="margin:6px 0 0 0; font-family:Arial,Helvetica,sans-serif;
                       font-size:13px; color:rgba(255,255,255,0.85);">${subtitle}</p>`
      : '',
    '          </td>',
    '        </tr>',

    // ── BODY ─────────────────────────────────────────────────────────────────
    '        <tr>',
    '          <td style="padding:32px 32px 8px 32px;">',
    '            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">',
    greeting
      ? `              <tr><td style="padding-bottom:16px; font-family:Arial,Helvetica,sans-serif;
                          font-size:15px; color:#333333; line-height:1.6;">${greeting}</td></tr>`
      : '',
    '              <tr>',
    '                <td style="font-family:Arial,Helvetica,sans-serif;',
    '                           font-size:15px; color:#333333; line-height:1.7;">',
    body,
    '                </td>',
    '              </tr>',
    btnRow,
    '            </table>',
    '          </td>',
    '        </tr>',

    // ── DIVIDER ──────────────────────────────────────────────────────────────
    '        <tr>',
    '          <td style="padding:24px 32px 0 32px;">',
    '            <hr style="border:none; border-top:1px solid #e5e7eb; margin:0;">',
    '          </td>',
    '        </tr>',

    // ── FOOTER ───────────────────────────────────────────────────────────────
    '        <tr>',
    '          <td style="padding:20px 32px 28px 32px;">',
    '            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">',
    '              <tr>',
    '                <td>',
    `                  <p style="margin:0 0 4px 0; font-family:Arial,Helvetica,sans-serif;`,
    `                             font-size:11px; color:#9ca3af;">${footer}</p>`,
    `                  <p style="margin:0; font-family:Arial,Helvetica,sans-serif;`,
    `                             font-size:11px; color:#d1d5db;">`,
    `                    &copy; ${new Date().getFullYear()} APS Construction &mdash; Tous droits r&eacute;serv&eacute;s`,
    `                  </p>`,
    '                </td>',
    `                <td align="right" valign="middle" style="padding-left:16px;">`,
    `                  <a href="${APP_URL}" style="font-family:Arial,Helvetica,sans-serif;`,
    `                                              font-size:11px; color:${accentColor};`,
    `                                              text-decoration:none;">`,
    `                    Accéder au portail`,
    `                  </a>`,
    `                </td>`,
    '              </tr>',
    '            </table>',
    '          </td>',
    '        </tr>',

    '      </table>',  // end card
    '    </td>',
    '  </tr>',
    '</table>',        // end outer wrapper
    '</body>',
    '</html>',
  ];

  return lines.join('\n');
}

// ──────────────────────────────────────────────────────────────────────────────
// Carte d'information (tableau à 2 colonnes label / valeur)
// ──────────────────────────────────────────────────────────────────────────────
function infoCard(rows: Array<{ label: string; value: string }>, accentColor: string): string {
  const rowsHtml = rows.map(r =>
    `<tr>
  <td style="padding:10px 16px; font-family:Arial,Helvetica,sans-serif;
             font-size:11px; font-weight:700; color:#6b7280;
             text-transform:uppercase; letter-spacing:0.6px;
             border-right:2px solid ${accentColor}; width:120px;
             vertical-align:top;">${r.label}</td>
  <td style="padding:10px 16px; font-family:Arial,Helvetica,sans-serif;
             font-size:14px; color:#111827; vertical-align:top;">${r.value}</td>
</tr>`
  ).join('\n<tr><td colspan="2" style="padding:0; border-top:1px solid #f3f4f6;"></td></tr>\n');

  return [
    '<table role="presentation" cellpadding="0" cellspacing="0" width="100%"',
    `       style="border:1px solid #e5e7eb; border-radius:2px; margin:16px 0 0 0; overflow:hidden;">`,
    rowsHtml,
    '</table>',
  ].join('\n');
}

// ──────────────────────────────────────────────────────────────────────────────
// Mapping type de notification → contenu email
// ──────────────────────────────────────────────────────────────────────────────
function getEmailContent(type: string, data: Record<string, string>): {
  subject: string;
  html: string;
} | null {
  const taskUrl  = data.taskId    ? `${APP_URL}/dashboard/tasks/${data.taskId}`    : APP_URL;
  const projUrl  = data.projectId ? `${APP_URL}/dashboard/projets/${data.projectId}` : APP_URL;
  const meetUrl  = data.meetingId ? `${APP_URL}/dashboard/meetings/${data.meetingId}` : APP_URL;

  switch (type) {

    // ── Tâche assignée ───────────────────────────────────────────────────────
    case 'task_assigned': {
      const subject = `[APS Construction] Nouvelle tâche assignée${data.taskTitle ? ' : ' + data.taskTitle : ''}`;
      const infoRows = [
        { label: 'Tâche',    value: data.taskTitle    || '—' },
        { label: 'Projet',   value: data.projectName  || '—' },
        { label: 'Assignée par', value: data.assignedBy || '—' },
        ...(data.dueDate ? [{ label: 'Échéance', value: data.dueDate }] : []),
      ];
      const html = buildEmail({
        accentColor: '#1e40af',
        badgeText: 'TÂCHE',
        title: 'Nouvelle tâche assignée',
        subtitle: data.taskTitle,
        greeting: data.recipientName ? `Bonjour ${data.recipientName},` : 'Bonjour,',
        body: [
          `<p style="margin:0 0 16px 0;">Vous avez été désigné(e) comme exécutant sur la tâche suivante :</p>`,
          infoCard(infoRows, '#1e40af'),
          data.description ? `<p style="margin:16px 0 0 0; color:#4b5563;">${data.description}</p>` : '',
        ].join('\n'),
        buttonText: 'Voir la tâche',
        buttonUrl: taskUrl,
      });
      return { subject, html };
    }

    // ── Tâche terminée ───────────────────────────────────────────────────────
    case 'task_completed': {
      const subject = `[APS Construction] Tâche terminée${data.taskTitle ? ' : ' + data.taskTitle : ''}`;
      const infoRows = [
        { label: 'Tâche',       value: data.taskTitle   || '—' },
        { label: 'Projet',      value: data.projectName || '—' },
        { label: 'Complétée par', value: data.completedBy || '—' },
      ];
      const html = buildEmail({
        accentColor: '#065f46',
        badgeText: 'TÂCHE',
        title: 'Tâche marquée comme terminée',
        subtitle: data.taskTitle,
        greeting: data.recipientName ? `Bonjour ${data.recipientName},` : 'Bonjour,',
        body: [
          `<p style="margin:0 0 16px 0;">La tâche suivante a été marquée comme terminée :</p>`,
          infoCard(infoRows, '#065f46'),
        ].join('\n'),
        buttonText: 'Voir la tâche',
        buttonUrl: taskUrl,
      });
      return { subject, html };
    }

    // ── Échéance approche ────────────────────────────────────────────────────
    case 'task_due_soon': {
      const subject = `[APS Construction] Échéance proche${data.taskTitle ? ' : ' + data.taskTitle : ''}`;
      const infoRows = [
        { label: 'Tâche',    value: data.taskTitle    || '—' },
        { label: 'Projet',   value: data.projectName  || '—' },
        { label: 'Échéance', value: data.dueDate       || '—' },
      ];
      const html = buildEmail({
        accentColor: '#b45309',
        badgeText: 'RAPPEL',
        title: 'Rappel : échéance proche',
        subtitle: data.taskTitle,
        greeting: data.recipientName ? `Bonjour ${data.recipientName},` : 'Bonjour,',
        body: [
          `<p style="margin:0 0 16px 0;">L'échéance de la tâche suivante approche. Merci de procéder à sa complétion :</p>`,
          infoCard(infoRows, '#b45309'),
        ].join('\n'),
        buttonText: 'Voir la tâche',
        buttonUrl: taskUrl,
      });
      return { subject, html };
    }

    // ── Réunion planifiée ────────────────────────────────────────────────────
    case 'meeting_scheduled': {
      const subject = `[APS Construction] Réunion planifiée${data.meetingTitle ? ' : ' + data.meetingTitle : ''}`;
      const infoRows = [
        { label: 'Réunion',   value: data.meetingTitle   || '—' },
        { label: 'Projet',    value: data.projectName     || '—' },
        { label: 'Date',      value: data.meetingDate     || '—' },
        { label: 'Lieu',      value: data.meetingLocation || '—' },
        { label: 'Organisée par', value: data.organizer   || '—' },
      ];
      const html = buildEmail({
        accentColor: '#4f46e5',
        badgeText: 'RÉUNION',
        title: 'Nouvelle réunion planifiée',
        subtitle: data.meetingTitle,
        greeting: data.recipientName ? `Bonjour ${data.recipientName},` : 'Bonjour,',
        body: [
          `<p style="margin:0 0 16px 0;">Vous avez été convié(e) à la réunion suivante :</p>`,
          infoCard(infoRows, '#4f46e5'),
          data.description ? `<p style="margin:16px 0 0 0; color:#4b5563;">${data.description}</p>` : '',
        ].join('\n'),
        buttonText: 'Voir la réunion',
        buttonUrl: meetUrl,
      });
      return { subject, html };
    }

    // ── Réunion rappel ───────────────────────────────────────────────────────
    case 'meeting_reminder': {
      const subject = `[APS Construction] Rappel réunion${data.meetingTitle ? ' : ' + data.meetingTitle : ''}`;
      const infoRows = [
        { label: 'Réunion', value: data.meetingTitle   || '—' },
        { label: 'Projet',  value: data.projectName     || '—' },
        { label: 'Date',    value: data.meetingDate     || '—' },
        { label: 'Lieu',    value: data.meetingLocation || '—' },
      ];
      const html = buildEmail({
        accentColor: '#7c3aed',
        badgeText: 'RAPPEL',
        title: 'Rappel : réunion imminente',
        subtitle: data.meetingTitle,
        greeting: data.recipientName ? `Bonjour ${data.recipientName},` : 'Bonjour,',
        body: [
          `<p style="margin:0 0 16px 0;">Rappel pour la réunion suivante :</p>`,
          infoCard(infoRows, '#7c3aed'),
        ].join('\n'),
        buttonText: 'Voir la réunion',
        buttonUrl: meetUrl,
      });
      return { subject, html };
    }

    // ── Ajout à un projet ────────────────────────────────────────────────────
    case 'project_added': {
      const subject = `[APS Construction] Ajout au projet${data.projectName ? ' : ' + data.projectName : ''}`;
      const infoRows = [
        { label: 'Projet',    value: data.projectName || '—' },
        { label: 'Ajouté par', value: data.addedBy    || '—' },
        { label: 'Votre rôle', value: data.role       || '—' },
      ];
      const html = buildEmail({
        accentColor: '#0369a1',
        badgeText: 'PROJET',
        title: 'Vous avez été ajouté(e) à un projet',
        subtitle: data.projectName,
        greeting: data.recipientName ? `Bonjour ${data.recipientName},` : 'Bonjour,',
        body: [
          `<p style="margin:0 0 16px 0;">Vous avez été ajouté(e) au projet suivant :</p>`,
          infoCard(infoRows, '#0369a1'),
          `<p style="margin:16px 0 0 0; color:#4b5563;">Connectez-vous pour accéder au projet et commencer à collaborer.</p>`,
        ].join('\n'),
        buttonText: 'Accéder au projet',
        buttonUrl: projUrl,
      });
      return { subject, html };
    }

    // ── Document partagé ─────────────────────────────────────────────────────
    case 'document_shared': {
      const subject = `[APS Construction] Document partagé${data.documentName ? ' : ' + data.documentName : ''}`;
      const infoRows = [
        { label: 'Document',    value: data.documentName  || '—' },
        { label: 'Projet',      value: data.projectName   || '—' },
        { label: 'Partagé par', value: data.sharedBy      || '—' },
      ];
      const html = buildEmail({
        accentColor: '#0f766e',
        badgeText: 'DOCUMENT',
        title: 'Nouveau document partagé',
        subtitle: data.documentName,
        greeting: data.recipientName ? `Bonjour ${data.recipientName},` : 'Bonjour,',
        body: [
          `<p style="margin:0 0 16px 0;">Un document a été partagé avec vous :</p>`,
          infoCard(infoRows, '#0f766e'),
        ].join('\n'),
        buttonText: 'Voir le document',
        buttonUrl: projUrl,
      });
      return { subject, html };
    }

    // ── Validation de document ───────────────────────────────────────────────
    case 'file_validation_request': {
      const subject = `[APS Construction] Validation requise${data.documentName ? ' : ' + data.documentName : ''}`;
      const infoRows = [
        { label: 'Document',    value: data.documentName  || '—' },
        { label: 'Projet',      value: data.projectName   || '—' },
        { label: 'Soumis par',  value: data.uploadedBy    || '—' },
      ];
      const html = buildEmail({
        accentColor: '#92400e',
        badgeText: 'VALIDATION',
        title: 'Validation de document requise',
        subtitle: data.documentName,
        greeting: data.recipientName ? `Bonjour ${data.recipientName},` : 'Bonjour,',
        body: [
          `<p style="margin:0 0 16px 0;">Votre validation est requise pour le document suivant :</p>`,
          infoCard(infoRows, '#92400e'),
        ].join('\n'),
        buttonText: 'Valider le document',
        buttonUrl: projUrl,
      });
      return { subject, html };
    }

    // ── Message reçu ─────────────────────────────────────────────────────────
    case 'message_received': {
      const subject = `[APS Construction] Nouveau message${data.senderName ? ' de ' + data.senderName : ''}`;
      const infoRows = [
        { label: 'De',      value: data.senderName  || '—' },
        { label: 'Groupe de travail',  value: data.projectName || '—' },
        ...(data.message ? [{ label: 'Message', value: `<em>${data.message}</em>` }] : []),
      ];
      const html = buildEmail({
        accentColor: '#1d4ed8',
        badgeText: 'MESSAGE',
        title: 'Nouveau message reçu',
        subtitle: data.senderName ? `De : ${data.senderName}` : undefined,
        greeting: data.recipientName ? `Bonjour ${data.recipientName},` : 'Bonjour,',
        body: [
          `<p style="margin:0 0 16px 0;">Vous avez reçu un nouveau message dans votre groupe de travail :</p>`,
          infoCard(infoRows, '#1d4ed8'),
        ].join('\n'),
        buttonText: 'Répondre',
        buttonUrl: APP_URL + '/dashboard/messages',
      });
      return { subject, html };
    }

    default:
      return null;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// ENTRY POINT
// Accepts TWO payload formats:
//
//  Format A — new structured format:
//    { type: 'task_assigned', to: 'x@y.com', data: { taskTitle, projectName, … } }
//
//  Format B — legacy format sent by the frontend sendNotification helper:
//    { to: 'x@y.com', subject: 'Titre', template: 'generic_notification',
//      variables: { title, message, link, type } }
// ──────────────────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: getCorsHeaders(req) });
  }

  try {
    const body = await req.json();

    // ── Normalise both formats into (type, to, subject, data) ────────────────
    let type: string    = body.type    || (body.variables?.type) || 'generic';
    let to: string      = body.to;
    let subject: string = body.subject || '';
    let data: Record<string, string> = body.data || {};

    // Legacy format: variables object → flatten into data
    if (body.variables && typeof body.variables === 'object') {
      data = { ...body.variables, ...data };
      if (!subject) subject = data.title || '';
    }

    if (!to) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: to' }),
        { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }


    // Try to build a structured email; fall back to a generic layout for unknown types
    let emailContent = getEmailContent(type, data);

    if (!emailContent) {
      // Generic fallback — works for legacy 'template' format or any unknown type
      const genericTitle = subject || data.title || 'Nouvelle notification';
      const genericBody  = data.message || '';
      const genericLink  = data.link || APP_URL;

      emailContent = {
        subject: `[APS Construction] ${genericTitle}`,
        html: buildEmail({
          accentColor: '#1e40af',
          badgeText: 'NOTIFICATION',
          title: genericTitle,
          greeting: 'Bonjour,',
          body: `<p style="margin:0 0 16px 0;">${genericBody}</p>`,
          buttonText: 'Accéder au portail',
          buttonUrl: genericLink,
        }),
      };
    }

    let emailSent = false;

    if (GMAIL_USER && GMAIL_APP_PASSWORD) {
      try {
        const smtpClient = new SMTPClient({
          connection: {
            hostname: 'smtp.gmail.com',
            port: 465,
            tls: true,
            auth: { username: GMAIL_USER, password: GMAIL_APP_PASSWORD },
          },
        });

        const finalSubject = (subject || emailContent.subject).replace(/\r?\n|\r/g, ' ');
        const cleanSubject = finalSubject
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^\x00-\x7F]/g, "");

        await smtpClient.send({
          from: GMAIL_USER,
          to: to,
          subject: cleanSubject,
          content: emailContent.html.replace(/<[^>]*>?/gm, ''),
          html: emailContent.html,
        });

        await smtpClient.close();
        emailSent = true;
        console.log(`Email [${type}] sent to ${to}`);
      } catch (smtpError) {
        console.error(`SMTP error sending to ${to}:`, smtpError);
      }
    } else {
      console.warn('GMAIL credentials not configured — email not sent');
    }

    return new Response(
      JSON.stringify({ success: true, emailSent, type, to }),
      { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-notification-email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});
