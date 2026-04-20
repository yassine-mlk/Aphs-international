import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StartVisaRequest {
  submission_id: string;
  circuit_id: string;
  emitted_by: string;
  emitted_by_role: string;
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

    const { submission_id, circuit_id, emitted_by, emitted_by_role }: StartVisaRequest = await req.json();

    // 1. Récupérer le circuit
    const { data: circuit, error: circuitError } = await supabase
      .from('visa_circuits')
      .select('*')
      .eq('id', circuit_id)
      .single();

    if (circuitError || !circuit) {
      return new Response(JSON.stringify({ error: 'Circuit non trouvé' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const steps = circuit.steps as Array<{ role: string; user_id: string; deadline_days: number; order_index: number }>;

    // 2. Créer l'instance
    const { data: instance, error: instanceError } = await supabase
      .from('visa_instances')
      .insert({
        submission_id,
        circuit_id,
        emitted_by,
        emitted_by_role,
        version_index: '0',
        current_step_index: 0,
        total_steps: steps.length,
        status: 'en_cours',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (instanceError || !instance) {
      return new Response(JSON.stringify({ error: instanceError?.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Créer les steps
    const now = new Date();
    const stepInserts = steps.map((step, index) => ({
      instance_id: instance.id,
      step_order: index,
      validator_user_id: step.user_id,
      validator_role: step.role,
      deadline_at: new Date(now.getTime() + step.deadline_days * 24 * 60 * 60 * 1000).toISOString(),
    }));

    const { error: stepsError } = await supabase.from('visa_steps').insert(stepInserts);

    if (stepsError) {
      return new Response(JSON.stringify({ error: stepsError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Log historique
    await supabase.from('visa_history').insert({
      instance_id: instance.id,
      submission_id,
      action: 'emission',
      actor_id: emitted_by,
      actor_role: emitted_by_role,
      details: { circuit_id, version_index: '0', total_steps: steps.length },
    });

    // 5. Notifier le premier validateur (step 0)
    const firstStep = steps[0];
    if (firstStep?.user_id) {
      await supabase.functions.invoke('notify-validator', {
        body: {
          validator_id: firstStep.user_id,
          step_id: instance.id, // On récupérera le vrai step_id dans notify-validator
          instance_id: instance.id,
        },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      instance_id: instance.id,
      message: 'Circuit de visa démarré',
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
