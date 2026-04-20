import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from 'https://esm.sh/resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotifyEmitterRequest {
  instance_id: string;
  reason: 'VAR' | 'expiration';
  comments?: string;
  rejected_by: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const resend = new Resend(Deno.env.get('RESEND_API_KEY') ?? '');

    const { instance_id, reason, comments, rejected_by }: NotifyEmitterRequest = await req.json();

    // 1. Récupérer l'instance
    const { data: instance } = await supabase
      .from('visa_instances')
      .select('*, circuit:visa_circuits(*), submission:task_submissions(*)')
      .eq('id', instance_id)
      .single();

    if (!instance) {
      return new Response(JSON.stringify({ error: 'Instance non trouvée' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const emitter_id = instance.emitted_by;
    const submission = instance.submission;
    const circuit = instance.circuit;

    // 2. Récupérer infos émetteur
    const { data: emitter } = await supabase
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('user_id', emitter_id)
      .single();

    if (!emitter?.email) {
      return new Response(JSON.stringify({ error: 'Émetteur sans email' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Récupérer infos du rejeteur
    const { data: rejecter } = await supabase
      .from('profiles')
      .select('first_name, last_name, role')
      .eq('user_id', rejected_by)
      .single();

    // 4. Récupérer infos projet
    const { data: project } = await supabase
      .from('projects')
      .select('name')
      .eq('id', circuit.project_id)
      .single();

    // 5. Construire l'email
    const isVAR = reason === 'VAR';
    const subject = isVAR
      ? `🔴 Document refusé - Resoumission requise - ${project?.name || 'Projet'}`
      : `⏰ Délai expiré - ${project?.name || 'Projet'}`;

    const html = `
      <div style="font-family: sans-serif; max-width: 600px;">
        <h2 style="color: ${isVAR ? '#dc2626' : '#ea580c'};">
          ${isVAR ? '🔴 Document refusé (VAR)' : '⏰ Délai de validation expiré'}
        </h2>
        
        <p>Bonjour ${emitter.first_name || ''},</p>
        
        ${isVAR ? `
          <p>Votre document a été refusé et doit être resoumis :</p>
          <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 15px 0;">
            <strong>Refusé par:</strong> ${rejecter?.first_name || ''} ${rejecter?.last_name || ''} (${rejecter?.role || ''})<br>
            <strong>Version actuelle:</strong> ${instance.version_index}<br>
            ${comments ? `<strong>Commentaires:</strong> ${comments}` : ''}
          </div>
          <p>La prochaine soumission sera la <strong>Version ${parseInt(instance.version_index) + 1}</strong>.</p>
        ` : `
          <p>Le délai de validation est expiré pour ce document :</p>
        `}
        
        <table style="width: 100%; background: #f5f5f5; padding: 15px; border-radius: 8px;">
          <tr><td><strong>Projet:</strong></td><td>${project?.name || 'Non spécifié'}</td></tr>
          <tr><td><strong>Document:</strong></td><td>${submission?.file_name || 'Sans nom'}</td></tr>
          <tr><td><strong>Circuit:</strong></td><td>${circuit?.name || 'Non spécifié'}</td></tr>
        </table>

        <p style="margin-top: 20px;">
          <a href="${Deno.env.get('APP_URL') || 'http://localhost:5173'}/projets/${circuit.project_id}" 
             style="background: ${isVAR ? '#dc2626' : '#ea580c'}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            ${isVAR ? 'Resoumettre le document' : 'Voir le document'}
          </a>
        </p>

        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          Cet email a été envoyé automatiquement par APHS International.
        </p>
      </div>
    `;

    // 6. Envoyer l'email
    const { error: emailError } = await resend.emails.send({
      from: Deno.env.get('EMAIL_FROM') || 'onboarding@resend.dev',
      to: emitter.email,
      subject,
      html,
    });

    if (emailError) {
      console.error('Erreur envoi email:', emailError);
    }

    return new Response(JSON.stringify({
      success: true,
      email_sent: !emailError,
      to: emitter.email,
      reason,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
