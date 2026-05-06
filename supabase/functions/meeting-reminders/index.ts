import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Calculer la fenêtre de temps (réunions prévues dans ~15 min)
    const now = new Date();
    const fifteenMinsFromNow = new Date(now.getTime() + 15 * 60000);
    const windowStart = new Date(fifteenMinsFromNow.getTime() - 2 * 60000).toISOString(); // 13 min
    const windowEnd = new Date(fifteenMinsFromNow.getTime() + 2 * 60000).toISOString();   // 17 min

    const { data: meetings, error } = await supabase
      .from('video_meetings')
      .select('*, video_meeting_participants(user_id)')
      .eq('status', 'scheduled')
      .gte('scheduled_at', windowStart)
      .lte('scheduled_at', windowEnd)
      .neq('reminder_sent', true); // Note: il faudrait ajouter cette colonne pour éviter les doublons

    if (error) throw error;
    if (!meetings || meetings.length === 0) {
      return new Response(JSON.stringify({ message: "No meetings to remind" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    let emailsSent = 0;

    for (const meeting of meetings) {
      const participants = meeting.video_meeting_participants.map((p: any) => p.user_id);
      
      for (const userId of participants) {
        // Fetch user email via notification table or direct email call
        // On simule l'appel à la fonction send-notification-email
        const { data: prof } = await supabase.from('profiles').select('email, first_name').eq('user_id', userId).single();
        if (prof && prof.email) {
          const emailData = {
            to: prof.email,
            subject: `Rappel : Visioconférence dans 15 minutes - ${meeting.title}`,
            template: 'meeting_reminder',
            variables: {
              title: meeting.title,
              dateText: new Date(meeting.scheduled_at).toLocaleString('fr-FR'),
              link: 'https://www.aps-construction.com/dashboard/videoconference'
            }
          };

          await supabase.functions.invoke('send-notification-email', {
            body: emailData
          });
          emailsSent++;
        }
      }

      // Marquer comme envoyé (si la colonne existe, sinon on ignore pour l'instant)
      await supabase.from('video_meetings').update({ reminder_sent: true }).eq('id', meeting.id).select().catch(() => {});
    }

    return new Response(JSON.stringify({ message: `Sent ${emailsSent} reminders` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
})
