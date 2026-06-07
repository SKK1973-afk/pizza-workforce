import { requireRouteAccess } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { getJoinedField } from '@/lib/supabase-helpers';

const STATUS_MAP: Record<string, { status: 'success' | 'warning' | 'info' | 'neutral'; label: string }> = {
  draft: { status: 'neutral', label: 'Draft' },
  pending_approval: { status: 'warning', label: 'Pending' },
  approved: { status: 'success', label: 'Approved' },
  exported: { status: 'info', label: 'Exported' },
};

export default async function TimesheetsPage() {
  const user = await requireRouteAccess('/timesheets');
  const supabase = await createClient();

  let query = supabase
    .from('timesheets')
    .select('*, user:users(id, full_name), store:stores(id, name)')
    .order('week_start_date', { ascending: false })
    .limit(50);

  if (user.role === 'store_manager' || user.role === 'two_ic') {
    query = query.eq('store_id', user.store_id!);
  } else if (user.role === 'area_manager' && user.area_store_ids?.length) {
    query = query.in('store_id', user.area_store_ids);
  }

  const { data: timesheets } = await query;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Timesheets</h1>
      <p className="text-slate-600 mb-6">Review and approve weekly timesheets</p>

      {!timesheets?.length ? (
        <EmptyState
          title="No timesheets"
          description="Timesheets will appear here once staff complete their weekly hours."
        />
      ) : (
        <div className="space-y-3">
          {timesheets.map((ts) => {
            const badge = STATUS_MAP[ts.status] ?? STATUS_MAP.draft;
            return (
              <Link key={ts.id} href={`/timesheets/${ts.id}`} className="card block hover:border-info transition">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="font-semibold">{getJoinedField(ts.user, 'full_name') ?? 'Unknown'}</p>
                    <p className="text-sm text-slate-500">
                      Week of {format(parseISO(ts.week_start_date), 'd MMM yyyy')} · {getJoinedField(ts.store, 'name')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">
                      {ts.ordinary_hours + ts.overtime_hours}h
                      {ts.gross_pay != null && ` · $${ts.gross_pay.toFixed(2)}`}
                    </span>
                    <StatusBadge status={badge.status}>{badge.label}</StatusBadge>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
