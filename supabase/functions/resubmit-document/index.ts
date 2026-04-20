import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResubmitRequest {
  instance_id: string;
  new_file_url: string;
  new_file_name: string;
  submitted_by: string;
}

function incrementVersionIndex(current: string): string {
  // Numérique: 0 → 1 → 2...
  const num = parseInt(current, 10);
  if (!isNaN(num)) {
    return (num + 1).toString();
  }
  // Alphabétique: A → B → C... (si besoin plus tard)
  return current;
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

    const { instance_id, new_file_url, new_file_name, submitted_by }: ResubmitRequest = await req.json();

    // 1. Récupérer l'instance actuelle
    const { data: oldInstance, error: oldError } = await supabase
      .from('visa_instances')
      .select('*, circuit:visa_circuits(*), submission:task_submissions(*)')
      .eq('id', instance_id)
      .single();

    if (oldError || !oldInstance) {
      return new Response(JSON.stringify({ error: 'Instance non trouvée' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const oldSubmission = oldInstance.submission;
    const circuit = oldInstance.circuit;
    const newVersionIndex = incrementVersionIndex(oldInstance.version_index);

    // 2. Créer nouvelle soumission avec version incrémentée
    const { data: newSubmission, error: subError } = await supabase
      .from('task_submissions')
      .insert({
        assignment_id: oldSubmission.assignment_id,
        occurrence_number: oldSubmission.occurrence_number,
        period_label: oldSubmission.period_label,
        version_index: newVersionIndex,
        file_url: new_file_url,
        file_name: new_file_name,
        submitted_by,
        submitted_at: new Date().toISOString(),
        simple_status: 'pending',
      })
      .select()
      .single();

    if (subError || !newSubmission) {
      return new Response(JSON.stringify({ error: subError?.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Créer nouvelle instance (reset au début du circuit)
    const { data: newInstance, error: instError } = await supabase
      .from('visa_instances')
      .insert({
        submission_id: newSubmission.id,
        circuit_id: oldInstance.circuit_id,
        emitted_by: submitted_by,
        emitted_by_role: oldInstance.emitted_by_role,
        version_index: newVersionIndex,
        current_step_index: 0,
        total_steps: oldInstance.total_steps,
        status: 'en_cours',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (instError || !newInstance) {
      return new Response(JSON.stringify({ error: instError?.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Recréer les steps
    const steps = circuit.steps as Array<{ role: string; user_id: string; deadline_days: number; order_index: number }>;
    const now = new Date();
    const stepInserts = steps.map((step, index) => ({
      instance_id: newInstance.id,
      step_order: index,
      validator_user_id: step.user_id,
      validator_role: step.role,
      deadline_at: new Date(now.getTime() + step.deadline_days * 24 * 60 * 60 * 1000).toISOString(),
    }));

    await supabase.from('visa_steps').insert(stepInserts);

    // 5. Log historique
    await supabase.from('visa_history').insert([
      {
        instance_id: oldInstance.id,
        submission_id: oldSubmission.id,
        action: 'resoumission',
        actor_id: submitted_by,
        actor_role: oldInstance.emitted_by_role,
        details: { from_version: oldInstance.version_index, to_version: newVersionIndex, reason: 'VAR' },
      },
      {
        instance_id: newInstance.id,
        submission_id: newSubmission.id,
        action: 'emission',
        actor_id: submitted_by,
        actor_role: oldInstance.emitted_by_role,
        details: { circuit_id: oldInstance.circuit_id, version_index: newVersionIndex, is_resubmit: true },
      },
    ]);

    // 6. Notifier le premier validateur
    const firstStep = steps[0];
    if (firstStep?.user_id) {
      await supabase.functions.invoke('notify-validator', {
        body: {
          validator_id: firstStep.user_id,
          step_id: newInstance.id,
          instance_id: newInstance.id,
          is_resubmit: true,
          version_index: newVersionIndex,
        },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      new_instance_id: newInstance.id,
      new_submission_id: newSubmission.id,
      version_index: newVersionIndex,
      message: `Document resoumis - Version ${newVersionIndex}`,
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
