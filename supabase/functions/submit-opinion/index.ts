import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SubmitOpinionRequest {
  step_id: string;
  opinion: 'F' | 'D' | 'S' | 'HM';
  visa_status: 'VSO' | 'VAO' | 'VAR';
  comments?: string;
  actor_id: string;
  actor_role: string;
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

    const { step_id, opinion, visa_status, comments, actor_id, actor_role }: SubmitOpinionRequest = await req.json();

    // 1. Récupérer le step et l'instance
    const { data: step, error: stepError } = await supabase
      .from('visa_steps')
      .select('*, instance:visa_instances(*)')
      .eq('id', step_id)
      .single();

    if (stepError || !step) {
      return new Response(JSON.stringify({ error: 'Étape non trouvée' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const instance = step.instance;
    const totalSteps = instance.total_steps;
    const currentStepIndex = instance.current_step_index;
    const isLastStep = currentStepIndex === totalSteps - 1;

    // 2. Mettre à jour le step avec l'avis et le visa
    const { error: updateError } = await supabase
      .from('visa_steps')
      .update({
        opinion,
        opinion_comment: comments,
        visa_status,
        visa_comment: comments,
        completed_at: new Date().toISOString(),
      })
      .eq('id', step_id);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Log historique
    await supabase.from('visa_history').insert({
      instance_id: instance.id,
      step_id,
      action: `opinion_${opinion}`,
      actor_id,
      actor_role,
      details: { opinion, visa_status, comments, step_order: step.step_order },
    });

    // 4. Logique de transition selon le visa
    let result: { action: string; next_step_id?: string; message: string } = { action: 'unknown', message: 'Action non déterminée' };

    if (visa_status === 'VSO') {
      // Visa Sans Observation → passe à l'étape suivante ou termine
      if (isLastStep) {
        // Dernier step → validation terminée
        await supabase
          .from('visa_instances')
          .update({ status: 'valide', completed_at: new Date().toISOString() })
          .eq('id', instance.id);

        await supabase.from('task_submissions')
          .update({ simple_status: 'validated' })
          .eq('id', instance.submission_id);

        result = { action: 'completed', message: 'Document validé (VSO final)' };
      } else {
        // Passe au step suivant
        const nextStepIndex = currentStepIndex + 1;
        await supabase
          .from('visa_instances')
          .update({ current_step_index: nextStepIndex })
          .eq('id', instance.id);

        // Notifier le prochain validateur
        const { data: nextStep } = await supabase
          .from('visa_steps')
          .select('*')
          .eq('instance_id', instance.id)
          .eq('step_order', nextStepIndex)
          .single();

        if (nextStep) {
          await supabase.functions.invoke('notify-validator', {
            body: {
              validator_id: nextStep.validator_user_id,
              step_id: nextStep.id,
              instance_id: instance.id,
            },
          });
          result = { action: 'next_step', next_step_id: nextStep.id, message: `Passé à l'étape ${nextStepIndex + 1}` };
        } else {
          result = { action: 'next_step', message: 'Étape suivante non trouvée' };
        }
      }
    } else if (visa_status === 'VAO') {
      // Visa Avec Observation → passe à l'étape suivante mais flag observations
      if (isLastStep) {
        await supabase
          .from('visa_instances')
          .update({ status: 'valide', completed_at: new Date().toISOString() })
          .eq('id', instance.id);
        
        result = { action: 'completed_with_obs', message: 'Document validé avec observations (VAO)' };
      } else {
        const nextStepIndex = currentStepIndex + 1;
        await supabase
          .from('visa_instances')
          .update({ current_step_index: nextStepIndex })
          .eq('id', instance.id);

        const { data: nextStep } = await supabase
          .from('visa_steps')
          .select('*')
          .eq('instance_id', instance.id)
          .eq('step_order', nextStepIndex)
          .single();

        if (nextStep) {
          await supabase.functions.invoke('notify-validator', {
            body: {
              validator_id: nextStep.validator_user_id,
              step_id: nextStep.id,
              instance_id: instance.id,
              has_observations: true,
            },
          });
          result = { action: 'next_step_with_obs', next_step_id: nextStep.id, message: `Passé à l'étape ${nextStepIndex + 1} (avec observations)` };
        } else {
          result = { action: 'next_step_with_obs', message: 'Étape suivante non trouvée' };
        }
      }
    } else if (visa_status === 'VAR') {
      // Visa À Resoumettre → retour à l'émetteur
      await supabase
        .from('visa_instances')
        .update({ status: 'refuse' })
        .eq('id', instance.id);

      // Notifier l'émetteur
      await supabase.functions.invoke('notify-emitter', {
        body: {
          instance_id: instance.id,
          reason: 'VAR',
          comments,
          rejected_by: actor_id,
        },
      });

      result = { action: 'returned', message: 'Document refusé, retour à l\'émetteur pour resoumission' };
    }

    return new Response(JSON.stringify({
      success: true,
      step_id,
      ...result,
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
