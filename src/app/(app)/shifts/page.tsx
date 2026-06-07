import { requireRouteAccess } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LiveShiftBoard } from '@/components/shifts/LiveShiftBoard';
import { formatInTimeZone } from 'date-fns-tz';
import { NZ_TIMEZONE } from '@/lib/nz-employment';
import { formatShiftDate, formatShiftTime } from '@/lib/dates';
import type { ShiftType } from '@/types';

const SHIFT_BADGE: Record<ShiftType, 'info' | 'warning' | 'neutral' | 'success'> = {
  morning: 'info',
  evening: 'warning',
  close: 'neutral',
  split: 'success',
};

export default async function ShiftsPage() {
  const user = await requireRouteAccess('/shifts');
  const supabase = await createClient();

  const today = formatInTimeZone(new Date(), NZ_TIMEZONE, 'yyyy-MM-dd');

  const { data: upcomingShifts } = await supabase
    .from('shifts')
    .select('*')
    .eq('user_id', user.id)
    .gte('shift_date', today)
    .order('shift_date')
    .order('scheduled_start')
    .limit(14);

  let liveBoard = null;
  if (user.store_id) {
    const { data: todayShifts } = await supabase
      .from('shifts')
      .select('*, user:users(id, full_name)')
      .eq('store_id', user.store_id)
      .eq('shift_date', today)
      .order('scheduled_start');

    const { data: todayEvents } = await supabase
      .from('clock_events')
      .select('*')
      .eq('store_id', user.store_id)
      .gte('event_time', `${today}T00:00:00`)
      .order('event_time');

    if (user.role === 'two_ic') {
      liveBoard = (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Today&apos;s Team</h2>
          <LiveShiftBoard
            storeId={user.store_id}
            initialShifts={todayShifts ?? []}
            initialClockEvents={todayEvents ?? []}
          />
        </div>
      );
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-2">My Shifts</h1>
      <p className="text-slate-600 mb-6">Your upcoming scheduled shifts</p>

      {!upcomingShifts?.length ? (
        <EmptyState
          title="No upcoming shifts"
          description="You have no shifts scheduled. Check back later or contact your manager."
        />
      ) : (
        <div className="space-y-3">
          {upcomingShifts.map((shift) => (
            <div key={shift.id} className="card">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{formatShiftDate(shift.shift_date)}</p>
                  <p className="text-sm text-slate-500 mt-1">
                    {formatShiftTime(shift.scheduled_start, shift.shift_date)} – {formatShiftTime(shift.scheduled_end, shift.shift_date)}
                  </p>
                  {shift.notes && <p className="text-sm text-slate-600 mt-2">{shift.notes}</p>}
                </div>
                {shift.shift_type && (
                  <StatusBadge status={SHIFT_BADGE[shift.shift_type as ShiftType]}>
                    <span className="capitalize">{shift.shift_type}</span>
                  </StatusBadge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {liveBoard}
    </div>
  );
}
