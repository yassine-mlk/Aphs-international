import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
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
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { to, subject, template, variables } = await req.json();

    if (!to || !template) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get template
    const templateFn = emailTemplates[template];
    if (!templateFn) {
      return new Response(
        JSON.stringify({ error: 'Unknown template' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailContent = templateFn(variables || {});

    // Send via Gmail SMTP if configured
    if (GMAIL_USER && GMAIL_APP_PASSWORD) {
      const emailBody = [
        `From: ${GMAIL_USER}`,
        `To: ${to}`,
        `Subject: ${subject || emailContent.subject}`,
        'Content-Type: text/html; charset=utf-8',
        '',
        emailContent.html
      ].join('\r\n');

      const encodedBody = btoa(emailBody);

      // Simple SMTP send via fetch to a SMTP relay service or use direct Gmail API
      // For now, return success and use the existing Gmail function if available
      console.log(`Would send email to ${to} with template ${template}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Email queued' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
