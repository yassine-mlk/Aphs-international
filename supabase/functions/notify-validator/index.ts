import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from 'https://esm.sh/resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotifyRequest {
  validator_id: string;
  step_id: string;
  instance_id: string;
  has_observations?: boolean;
  is_resubmit?: boolean;
  version_index?: string;
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

    const { validator_id, step_id, instance_id, has_observations, is_resubmit, version_index }: NotifyRequest = await req.json();

    // 1. Récupérer les infos du validateur
    const { data: validator } = await supabase
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('user_id', validator_id)
      .single();

    if (!validator?.email) {
      return new Response(JSON.stringify({ error: 'Validateur sans email' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Récupérer les infos de l'instance
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

    const circuit = instance.circuit;
    const submission = instance.submission;

    // 3. Récupérer infos projet
    const { data: project } = await supabase
      .from('projects')
      .select('name')
      .eq('id', circuit.project_id)
      .single();

    // 4. Construire l'email
    const subject = is_resubmit
      ? `📋 [Resoumission] Document à valider - ${project?.name || 'Projet'}`
      : `📋 Document à valider - ${project?.name || 'Projet'}`;

    const html = `
      <div style="font-family: sans-serif; max-width: 600px;">
        <h2>${is_resubmit ? '🔁 Nouvelle version à valider' : '📋 Nouveau document à valider'}</h2>
        
        <p>Bonjour ${validator.first_name || ''},</p>
        
        <p>Un document vous a été soumis pour validation${is_resubmit ? ` (Version ${version_index || 'nouvelle'})` : ''} :</p>
        
        <table style="width: 100%; background: #f5f5f5; padding: 15px; border-radius: 8px;">
          <tr><td><strong>Projet:</strong></td><td>${project?.name || 'Non spécifié'}</td></tr>
          <tr><td><strong>Document:</strong></td><td>${submission?.file_name || 'Sans nom'}</td></tr>
          <tr><td><strong>Circuit:</strong></td><td>${circuit?.name || 'Non spécifié'}</td></tr>
          ${has_observations ? '<tr><td colspan="2" style="color: orange;">⚠️ Ce document a des observations des validateurs précédents</td></tr>' : ''}
        </table>

        <p style="margin-top: 20px;">
          <a href="${Deno.env.get('APP_URL') || 'http://localhost:5173'}/validations" 
             style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Accéder à la validation
          </a>
        </p>

        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          Cet email a été envoyé automatiquement par APHS International.
        </p>
      </div>
    `;

    // 5. Envoyer l'email
    const { error: emailError } = await resend.emails.send({
      from: Deno.env.get('EMAIL_FROM') || 'onboarding@resend.dev',
      to: validator.email,
      subject,
      html,
    });

    if (emailError) {
      console.error('Erreur envoi email:', emailError);
    }

    // 6. Marquer comme notifié
    await supabase
      .from('visa_steps')
      .update({ notified_at: new Date().toISOString() })
      .eq('id', step_id);

    return new Response(JSON.stringify({
      success: true,
      email_sent: !emailError,
      to: validator.email,
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
