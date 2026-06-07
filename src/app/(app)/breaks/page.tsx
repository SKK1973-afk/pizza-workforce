import { requireRouteAccess } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { format, parseISO, subDays } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { NZ_TIMEZONE } from '@/lib/nz-employment';

export default async function BreaksPage() {
  const user = await requireRouteAccess('/breaks');
  const supabase = await createClient();

  const today = formatInTimeZone(new Date(), NZ_TIMEZONE, 'yyyy-MM-dd');
  const weekAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');

  let storeFilter: { store_id?: string } = {};
  if (user.role === 'store_manager' || user.role === 'two_ic') {
    storeFilter = { store_id: user.store_id! };
  }

  const { data: events } = await supabase
    .from('clock_events')
    .select('*, user:users(full_name)')
    .in('event_type', ['rest_break_start', 'rest_break_end', 'lunch_break_start', 'lunch_break_end'])
    .gte('event_time', `${weekAgo}T00:00:00`)
    .match(storeFilter)
    .order('event_time', { ascending: false })
    .limit(100);

  const breakStarts = (events ?? []).filter((e) =>
    ['rest_break_start', 'lunch_break_start'].includes(e.event_type)
  );

  const completedBreaks = breakStarts.map((start) => {
    const endType = start.event_type === 'rest_break_start' ? 'rest_break_end' : 'lunch_break_end';
    const end = (events ?? []).find(
      (e) => e.user_id === start.user_id && e.event_type === endType && e.event_time > start.event_time
    );
    const startTime = parseISO(start.event_time);
    const endTime = end ? parseISO(end.event_time) : null;
    const durationMin = endTime ? Math.round((endTime.getTime() - startTime.getTime()) / 60000) : null;
    const expectedMin = start.event_type === 'rest_break_start' ? 10 : 30;
    const compliant = durationMin != null && Math.abs(durationMin - expectedMin) <= 5;

    return { start, end, durationMin, expectedMin, compliant };
  });

  const breachCount = completedBreaks.filter((b) => b.durationMin != null && !b.compliant).length;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Break Compliance</h1>
      <p className="text-slate-600 mb-6">Monitor rest and lunch break adherence (last 7 days)</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card">
          <p className="text-sm text-slate-500">Breaks Logged</p>
          <p className="text-3xl font-bold mt-1">{breakStarts.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Compliant</p>
          <p className="text-3xl font-bold mt-1 text-compliant">
            {completedBreaks.filter((b) => b.compliant).length}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Breaches</p>
          <p className="text-3xl font-bold mt-1 text-breach">{breachCount}</p>
        </div>
      </div>

      {completedBreaks.length === 0 ? (
        <EmptyState
          title="No break data"
          description="Break compliance records will appear here once staff clock their breaks."
        />
      ) : (
        <div className="space-y-2">
          {completedBreaks.map(({ start, durationMin, expectedMin, compliant }) => (
            <div key={start.id} className="card py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="font-medium">{start.user?.full_name}</p>
                <p className="text-sm text-slate-500">
                  {format(parseISO(start.event_time), 'EEE d MMM, h:mm a')} ·{' '}
                  <span className="capitalize">{start.event_type.replace(/_break_start/g, '').replace(/_/g, ' ')}</span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                {durationMin != null ? (
                  <span className="text-sm">{durationMin} min (expected {expectedMin})</span>
                ) : (
                  <span className="text-sm text-slate-400">In progress</span>
                )}
                <StatusBadge status={compliant ? 'success' : durationMin != null ? 'danger' : 'warning'}>
                  {compliant ? 'Compliant' : durationMin != null ? 'Breach' : 'Open'}
                </StatusBadge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
