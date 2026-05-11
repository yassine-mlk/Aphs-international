import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import { corsHeaders } from '../_shared/cors.ts';



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
