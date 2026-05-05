import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const ALLOWED_ORIGINS = ['https://www.aps-construction.com', 'https://aps-construction.com'];

const getCorsHeaders = (req?: Request) => {
  const origin = req?.headers?.get('origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
};

// DEPRECATED: use getCorsHeaders(req) instead
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.aps-construction.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Gmail SMTP Configuration
const GMAIL_USER = Deno.env.get('GMAIL_USER');
const GMAIL_APP_PASSWORD = Deno.env.get('GMAIL_APP_PASSWORD');

const emailTemplates: Record<string, (vars: Record<string, string>) => { subject: string; html: string }> = {
  task_assigned: (vars) => ({
    subject: `Nouvelle tâche assignée: ${vars.taskName}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: #2563eb; color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .task-info { background: #f8fafc; padding: 20px; border-radius: 6px; margin: 20px 0; }
    .info-row { margin: 10px 0; }
    .label { color: #64748b; font-size: 14px; }
    .value { color: #1e293b; font-weight: 600; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
    .footer { background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 Nouvelle tâche assignée</h1>
    </div>
    <div class="content">
      <p>Bonjour,</p>
      <p>Une nouvelle tâche vous a été assignée.</p>
      
      <div class="task-info">
        <div class="info-row">
          <span class="label">Tâche:</span><br>
          <span class="value">${vars.taskName}</span>
        </div>
        <div class="info-row">
          <span class="label">Projet:</span><br>
          <span class="value">${vars.projectName}</span>
        </div>
        <div class="info-row">
          <span class="label">Assignée par:</span><br>
          <span class="value">${vars.assignedByName}</span>
        </div>
        ${vars.dueDate && vars.dueDate !== 'Non définie' ? `
        <div class="info-row">
          <span class="label">Échéance:</span><br>
          <span class="value">${vars.dueDate}</span>
        </div>
        ` : ''}
      </div>
      
      <p>Connectez-vous à votre espace pour voir les détails de cette tâche.</p>
      
      <a href="${vars.appUrl || 'https://aps-international.netlify.app'}" class="button">Accéder à mon espace</a>
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement par APS.</p>
    </div>
  </div>
</body>
</html>`
  }),

  task_validated: (vars) => ({
    subject: `Tâche validée: ${vars.taskName}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: #22c55e; color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .success-box { background: #dcfce7; border-left: 4px solid #22c55e; padding: 20px; margin: 20px 0; }
    .footer { background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Tâche validée</h1>
    </div>
    <div class="content">
      <p>Bonjour,</p>
      
      <div class="success-box">
        <p><strong>Bonne nouvelle !</strong></p>
        <p>La tâche <strong>"${vars.taskName}"</strong> du projet <strong>${vars.projectName}</strong> a été validée par ${vars.actorName}.</p>
      </div>
      
      <p>Vous pouvez consulter les détails dans votre espace.</p>
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement par APS.</p>
    </div>
  </div>
</body>
</html>`
  }),

  member_added: (vars) => ({
    subject: `Vous êtes membre du projet ${vars.projectName}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: #8b5cf6; color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .welcome-box { background: #f3e8ff; border-left: 4px solid #8b5cf6; padding: 20px; margin: 20px 0; }
    .button { display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
    .footer { background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Bienvenue dans le projet</h1>
    </div>
    <div class="content">
      <p>Bonjour,</p>
      
      <div class="welcome-box">
        <p>Vous avez été ajouté au projet <strong>${vars.projectName}</strong> par ${vars.addedByName}.</p>
        <p>Votre rôle: <strong>${vars.role}</strong></p>
      </div>
      
      <p>Connectez-vous pour accéder au projet et commencer à collaborer.</p>
      
      <a href="${vars.appUrl || 'https://aps-international.netlify.app'}" class="button">Accéder au projet</a>
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement par APS.</p>
    </div>
  </div>
</body>
</html>`
  }),

  message_received: (vars) => ({
    subject: `Nouveau message de ${vars.senderName}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: #f59e0b; color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .message-box { background: #fef3c7; padding: 20px; border-radius: 6px; margin: 20px 0; font-style: italic; }
    .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
    .footer { background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💬 Nouveau message</h1>
    </div>
    <div class="content">
      <p>Bonjour,</p>
      <p>Vous avez reçu un nouveau message de <strong>${vars.senderName}</strong>:</p>
      
      <div class="message-box">
        "${vars.messagePreview}"
      </div>
      
      <a href="${vars.appUrl || 'https://aps-international.netlify.app'}/dashboard/messages" class="button">Voir le message</a>
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement par APS.</p>
    </div>
  </div>
</body>
</html>`
  }),

  workflow_status_changed: (vars) => ({
    subject: `Tâche ${vars.status}: ${vars.taskName}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: ${vars.status === 'validée' ? '#22c55e' : vars.status === 'refusée' ? '#ef4444' : '#f59e0b'}; color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .status-box { background: ${vars.status === 'validée' ? '#dcfce7' : vars.status === 'refusée' ? '#fee2e2' : '#fef3c7'}; 
                border-left: 4px solid ${vars.status === 'validée' ? '#22c55e' : vars.status === 'refusée' ? '#ef4444' : '#f59e0b'}; 
                padding: 20px; margin: 20px 0; }
    .footer { background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${vars.status === 'validée' ? '✅' : vars.status === 'refusée' ? '❌' : '⏳'} Tâche ${vars.status}</h1>
    </div>
    <div class="content">
      <p>Bonjour,</p>
      
      <div class="status-box">
        <p>La tâche <strong>"${vars.taskName}"</strong> du projet <strong>${vars.projectName}</strong> a été <strong>${vars.status}</strong> par ${vars.actorName}.</p>
      </div>
      
      <p>Connectez-vous à votre espace pour voir les détails.</p>
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement par APS.</p>
    </div>
  </div>
</body>
</html>`
  }),

  signature_confirmed: (vars) => ({
    subject: `Document signé: ${vars.documentName}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: #10b981; color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .signature-box { background: #d1fae5; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; }
    .footer { background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✍️ Document signé électroniquement</h1>
    </div>
    <div class="content">
      <p>Bonjour,</p>
      
      <div class="signature-box">
        <p><strong>${vars.signerName}</strong> a signé le document:</p>
        <p style="font-size: 18px; margin: 10px 0;"><strong>${vars.documentName}</strong></p>
        <p>Projet: <strong>${vars.projectName}</strong></p>
      </div>
      
      <p>Cette signature électronique a été enregistrée dans le système.</p>
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement par APS.</p>
    </div>
  </div>
</body>
</html>`
  }),

  meeting_request: (vars) => ({
    subject: `Demande de visioconférence: ${vars.subject}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: #2563eb; color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .info-box { background: #f8fafc; padding: 20px; border-radius: 6px; margin: 20px 0; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
    .footer { background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📹 Demande de visioconférence</h1>
    </div>
    <div class="content">
      <p>Bonjour,</p>
      <p><strong>${vars.intervenantName}</strong> demande une réunion visioconférence.</p>
      
      <div class="info-box">
        <p><strong>Objet:</strong> ${vars.subject}</p>
        <p><strong>Date souhaitée:</strong> ${vars.dateText}</p>
      </div>
      
      <a href="${vars.link || 'https://aps-v3.vercel.app/dashboard/videoconference?tab=pending'}" class="button">Gérer la demande</a>
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement par APS.</p>
    </div>
  </div>
</body>
</html>`
  }),

  meeting_reminder: (vars) => ({
    subject: `Rappel: Visioconférence "${vars.title}"`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: #2563eb; color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .info-box { background: #f8fafc; padding: 20px; border-radius: 6px; margin: 20px 0; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
    .footer { background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📅 Rappel de visioconférence</h1>
    </div>
    <div class="content">
      <p>Bonjour,</p>
      <p>Ceci est un rappel pour votre réunion visioconférence :</p>
      
      <div class="info-box">
        <p><strong>Titre:</strong> ${vars.title}</p>
        <p><strong>Date:</strong> ${vars.dateText}</p>
      </div>
      
      <a href="${vars.link || 'https://aps-v3.vercel.app/dashboard/videoconference'}" class="button">Rejoindre la réunion</a>
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement par APS.</p>
    </div>
  </div>
</body>
</html>`
  }),

  meeting_accepted: (vars) => ({
    subject: `Demande acceptée: ${vars.subject}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: #22c55e; color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .info-box { background: #f8fafc; padding: 20px; border-radius: 6px; margin: 20px 0; }
    .button { display: inline-block; background: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
    .footer { background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Demande acceptée</h1>
    </div>
    <div class="content">
      <p>Bonjour,</p>
      <p>Votre demande de visioconférence a été acceptée.</p>
      
      <div class="info-box">
        <p><strong>Objet:</strong> ${vars.subject}</p>
        <p><strong>Date confirmée:</strong> ${vars.dateText}</p>
      </div>
      
      <a href="${vars.link || 'https://aps-v3.vercel.app/dashboard/videoconference'}" class="button">Voir mes réunions</a>
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement par APS.</p>
    </div>
  </div>
</body>
</html>`
  }),

  meeting_refused: (vars) => ({
    subject: `Demande refusée: ${vars.subject}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: #ef4444; color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .info-box { background: #fee2e2; border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0; }
    .footer { background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>❌ Demande refusée</h1>
    </div>
    <div class="content">
      <p>Bonjour,</p>
      <p>Malheureusement, votre demande de visioconférence a été refusée.</p>
      
      <div class="info-box">
        <p><strong>Objet:</strong> ${vars.subject}</p>
        <p><strong>Raison:</strong> ${vars.reason || 'Non spécifiée'}</p>
      </div>
      
      <p>Vous pouvez soumettre une nouvelle demande avec d'autres créneaux si nécessaire.</p>
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement par APS.</p>
    </div>
  </div>
</body>
</html>`
  }),
  generic_notification: (vars) => ({
    subject: vars.subject || vars.title || 'Nouvelle notification APS',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: #2563eb; color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px; }
    .message-box { background: #f8fafc; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #2563eb; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
    .footer { background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔔 Nouvelle Notification</h1>
    </div>
    <div class="content">
      <p>Bonjour,</p>
      <p>Vous avez reçu une nouvelle notification sur APS :</p>
      
      <div class="message-box">
        <p><strong>${vars.title || 'Notification'}</strong></p>
        <p>${vars.message || ''}</p>
      </div>
      
      ${vars.link ? `<a href="${vars.appUrl || 'https://aps-international.netlify.app'}${vars.link}" class="button">Voir sur mon espace</a>` : ''}
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement par APS.</p>
    </div>
  </div>
</body>
</html>`
  }),
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) });
  }

  try {
    const { to, subject, template, variables } = await req.json();

    if (!to || !template) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    // Get template
    const templateFn = emailTemplates[template];
    if (!templateFn) {
      return new Response(
        JSON.stringify({ error: 'Unknown template' }),
        { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    const emailContent = templateFn(variables || {});

    // Send via Gmail SMTP if configured
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
          content: emailContent.html.replace(/<[^>]*>?/gm, ''), // Simple text fallback
          html: emailContent.html,
        });

        await smtpClient.close();
        console.log(`Email sent to ${to} with template ${template}`);
      } catch (smtpError) {
        console.error('SMTP Error:', smtpError);
        // Fallback or error response
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
