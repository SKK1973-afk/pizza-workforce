import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getApiUser } from '@/lib/api-auth';
import { canAccessStore } from '@/lib/permissions';
import { computeTimesheetTotals, getWeekStart } from '@/lib/timesheet-engine';
import { parseISO } from 'date-fns';

export async function POST(request: Request) {
  const auth = await getApiUser();
  if (auth instanceof NextResponse) return auth;
  const { user: currentUser } = auth;

  const body = await request.json();
  const targetUserId = body.user_id || currentUser.id;
  const weekStartDate = body.week_start_date || getWeekStart(new Date());

  if (targetUserId !== currentUser.id) {
    const { data: target } = await (await createClient())
      .from('users')
      .select('store_id')
      .eq('id', targetUserId)
      .single();
    if (!target?.store_id || !canAccessStore(currentUser, target.store_id)) {
      const managerRoles = ['store_manager', 'head_of_operations', 'area_manager', 'hr_head'];
      if (!managerRoles.includes(currentUser.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
  }

  const supabase = await createClient();

  const { data: staffUser } = await supabase
    .from('users')
    .select('*')
    .eq('id', targetUserId)
    .single();

  if (!staffUser?.store_id) {
    return NextResponse.json({ error: 'User has no store assigned' }, { status: 400 });
  }

  const weekStart = parseISO(weekStartDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const { data: events } = await supabase
    .from('clock_events')
    .select('*')
    .eq('user_id', targetUserId)
    .gte('event_time', weekStart.toISOString())
    .lt('event_time', weekEnd.toISOString())
    .order('event_time');

  const totals = computeTimesheetTotals(events ?? [], weekStartDate, staffUser);
  const hasHours = totals.ordinaryHours + totals.overtimeHours > 0;

  const { data: existing } = await supabase
    .from('timesheets')
    .select('id, status')
    .eq('user_id', targetUserId)
    .eq('week_start_date', weekStartDate)
    .maybeSingle();

  const payload = {
    user_id: targetUserId,
    store_id: staffUser.store_id,
    week_start_date: weekStartDate,
    ordinary_hours: totals.ordinaryHours,
    overtime_hours: totals.overtimeHours,
    paid_break_minutes: totals.paidBreakMinutes,
    unpaid_break_minutes: totals.unpaidBreakMinutes,
    gross_pay: totals.grossPay,
    status: hasHours ? 'pending_approval' : 'draft',
    updated_at: new Date().toISOString(),
  };

  if (existing && existing.status !== 'draft') {
    if (existing.status === 'approved' || existing.status === 'exported') {
      return NextResponse.json({ message: 'Timesheet already approved', id: existing.id });
    }
    const { data, error } = await supabase
      .from('timesheets')
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  const { data, error } = await supabase
    .from('timesheets')
    .upsert(payload, { onConflict: 'user_id,week_start_date' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
