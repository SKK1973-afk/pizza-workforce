import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getApiUser } from '@/lib/api-auth';
import { canApproveTimesheets } from '@/lib/permissions';
import { computeTimesheetTotals } from '@/lib/timesheet-engine';
import { parseISO } from 'date-fns';

export async function POST(request: Request) {
  const auth = await getApiUser();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const { store_id, week_start_date } = await request.json();
  if (!store_id || !week_start_date) {
    return NextResponse.json({ error: 'store_id and week_start_date required' }, { status: 400 });
  }
  if (!canApproveTimesheets(user, store_id) && user.role !== 'head_of_operations') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: staff } = await supabase
    .from('users')
    .select('*')
    .eq('store_id', store_id)
    .in('role', ['team_member', 'two_ic'])
    .eq('is_active', true);

  if (!staff?.length) {
    return NextResponse.json({ error: 'No staff found' }, { status: 404 });
  }

  const weekStart = parseISO(week_start_date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  let synced = 0;
  for (const member of staff) {
    const { data: events } = await supabase
      .from('clock_events')
      .select('*')
      .eq('user_id', member.id)
      .gte('event_time', weekStart.toISOString())
      .lt('event_time', weekEnd.toISOString());

    const totals = computeTimesheetTotals(events ?? [], week_start_date, member);
    if (totals.ordinaryHours + totals.overtimeHours <= 0) continue;

    await supabase.from('timesheets').upsert(
      {
        user_id: member.id,
        store_id: store_id,
        week_start_date,
        ordinary_hours: totals.ordinaryHours,
        overtime_hours: totals.overtimeHours,
        paid_break_minutes: totals.paidBreakMinutes,
        unpaid_break_minutes: totals.unpaidBreakMinutes,
        gross_pay: totals.grossPay,
        status: 'pending_approval',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,week_start_date' }
    );
    synced++;
  }

  return NextResponse.json({ synced });
}
