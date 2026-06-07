import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getApiUser } from '@/lib/api-auth';
import { canEditRoster } from '@/lib/permissions';
import type { ShiftType } from '@/types';

export async function POST(request: Request) {
  const auth = await getApiUser();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const body = await request.json();
  const { store_id, user_id, shift_date, scheduled_start, scheduled_end, shift_type, week_start_date, notes } = body;

  if (!store_id || !user_id || !shift_date || !scheduled_start || !scheduled_end || !week_start_date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (!canEditRoster(user, store_id)) {
    return NextResponse.json({ error: 'You cannot edit this roster' }, { status: 403 });
  }

  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from('shifts')
    .insert({
      store_id,
      user_id,
      shift_date,
      scheduled_start: formatTimeTz(scheduled_start),
      scheduled_end: formatTimeTz(scheduled_end),
      shift_type: (shift_type as ShiftType) || 'morning',
      week_start_date,
      notes: notes || null,
      created_by: user.id,
      published: false,
    })
    .select('*, user:users(id, full_name)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

function formatTimeTz(time: string): string {
  if (time.includes('+') || time.includes('Z')) return time;
  if (/^\d{2}:\d{2}$/.test(time)) return `${time}+12`;
  return time.includes(':') ? `${time}+12` : `${time}:00+12`;
}
