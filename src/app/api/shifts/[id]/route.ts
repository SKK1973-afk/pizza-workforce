import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getApiUser } from '@/lib/api-auth';
import { canEditRoster } from '@/lib/permissions';
import type { ShiftType } from '@/types';

function formatTimeTz(time: string): string {
  if (time.includes('+') || time.includes('Z')) return time;
  if (/^\d{2}:\d{2}$/.test(time)) return `${time}+12`;
  return `${time}+12`;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiUser();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;
  const { id } = await params;
  const body = await request.json();

  const supabase = await createServiceClient();
  const { data: existing } = await supabase.from('shifts').select('store_id').eq('id', id).single();
  if (!existing) return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
  if (!canEditRoster(user, existing.store_id)) {
    return NextResponse.json({ error: 'You cannot edit this roster' }, { status: 403 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.scheduled_start) updates.scheduled_start = formatTimeTz(body.scheduled_start);
  if (body.scheduled_end) updates.scheduled_end = formatTimeTz(body.scheduled_end);
  if (body.shift_type) updates.shift_type = body.shift_type as ShiftType;
  if (body.notes !== undefined) updates.notes = body.notes;
  if (body.shift_date) updates.shift_date = body.shift_date;

  const { data, error } = await supabase
    .from('shifts')
    .update(updates)
    .eq('id', id)
    .select('*, user:users(id, full_name)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiUser();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;
  const { id } = await params;

  const supabase = await createServiceClient();
  const { data: existing } = await supabase.from('shifts').select('store_id').eq('id', id).single();
  if (!existing) return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
  if (!canEditRoster(user, existing.store_id)) {
    return NextResponse.json({ error: 'You cannot edit this roster' }, { status: 403 });
  }

  const { error } = await supabase.from('shifts').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
