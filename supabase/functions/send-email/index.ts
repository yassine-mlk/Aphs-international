import { Resend } from 'resend';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

interface EmailRequest {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { to, subject, html, text }: EmailRequest = await req.json();

    const { data, error } = await resend.emails.send({
      from: Deno.env.get('EMAIL_FROM') || 'onboarding@resend.dev',
      to,
      subject,
      html,
      text,
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, id: data?.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
