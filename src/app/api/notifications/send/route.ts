import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { to, subject, body, eventType } = await request.json();

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ sent: false, reason: 'RESEND_API_KEY not configured' });
  }

  try {
    await resend.emails.send({
      from: 'Pizza Workforce <notifications@yourdomain.com>',
      to,
      subject,
      text: body,
    });

    await supabase.from('audit_log').insert({
      user_id: user.id,
      action: `notification_sent:${eventType}`,
      new_values: { to, subject },
    });

    return NextResponse.json({ sent: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Send failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
