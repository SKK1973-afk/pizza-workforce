'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { format, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { NZ_TIMEZONE } from '@/lib/nz-employment';
import { formatShiftTime } from '@/lib/dates';
import type { ClockEvent, Shift, User } from '@/types';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface LiveShiftBoardProps {
  storeId: string;
  initialShifts: (Shift & { user?: Pick<User, 'full_name'> })[];
  initialClockEvents: ClockEvent[];
}

function getShiftStatus(events: ClockEvent[]): 'scheduled' | 'on_shift' | 'on_break' | 'completed' {
  if (events.length === 0) return 'scheduled';
  const last = events[events.length - 1];
  if (last.event_type === 'clock_out') return 'completed';
  if (['rest_break_start', 'lunch_break_start'].includes(last.event_type)) return 'on_break';
  if (last.event_type === 'clock_in' || ['rest_break_end', 'lunch_break_end'].includes(last.event_type)) return 'on_shift';
  return 'scheduled';
}

const STATUS_BADGE: Record<string, { status: 'success' | 'warning' | 'info' | 'neutral'; label: string }> = {
  scheduled: { status: 'neutral', label: 'Scheduled' },
  on_shift: { status: 'success', label: 'On Shift' },
  on_break: { status: 'warning', label: 'On Break' },
  completed: { status: 'info', label: 'Completed' },
};

export function LiveShiftBoard({ storeId, initialShifts, initialClockEvents }: LiveShiftBoardProps) {
  const supabase = createClient();
  const [shifts, setShifts] = useState(initialShifts);
  const [clockEvents, setClockEvents] = useState(initialClockEvents);

  const today = formatInTimeZone(new Date(), NZ_TIMEZONE, 'yyyy-MM-dd');

  const loadData = useCallback(async () => {
    const { data: shiftData } = await supabase
      .from('shifts')
      .select('*, user:users(id, full_name)')
      .eq('store_id', storeId)
      .eq('shift_date', today)
      .order('scheduled_start');

    const { data: eventData } = await supabase
      .from('clock_events')
      .select('*')
      .eq('store_id', storeId)
      .gte('event_time', `${today}T00:00:00`)
      .order('event_time');

    if (shiftData) setShifts(shiftData as typeof initialShifts);
    if (eventData) setClockEvents(eventData as ClockEvent[]);
  }, [supabase, storeId, today]);

  useEffect(() => {
    const channel = supabase
      .channel(`shift-board-${storeId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clock_events', filter: `store_id=eq.${storeId}` }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts', filter: `store_id=eq.${storeId}` }, () => loadData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, storeId, loadData]);

  function getEventsForUser(userId: string) {
    return clockEvents.filter((e) => e.user_id === userId);
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">
        Live board for {format(parseISO(today), 'EEEE, d MMMM yyyy')}
      </p>

      {shifts.length === 0 ? (
        <p className="text-slate-500 text-sm">No shifts scheduled for today.</p>
      ) : (
        <div className="space-y-2">
          {shifts.map((shift) => {
            const events = getEventsForUser(shift.user_id);
            const status = getShiftStatus(events);
            const badge = STATUS_BADGE[status];
            return (
              <div key={shift.id} className="card py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{shift.user?.full_name ?? 'Unknown'}</p>
                  <p className="text-sm text-slate-500">
                    {formatShiftTime(shift.scheduled_start, shift.shift_date)} – {formatShiftTime(shift.scheduled_end, shift.shift_date)}
                  </p>
                </div>
                <StatusBadge status={badge.status}>{badge.label}</StatusBadge>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
