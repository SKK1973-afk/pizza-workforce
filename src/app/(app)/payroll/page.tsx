import { requireRouteAccess } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PayrollExport } from '@/components/payroll/PayrollExport';
import { EmptyState } from '@/components/ui/EmptyState';
import { format, startOfWeek, subWeeks } from 'date-fns';
import Link from 'next/link';

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const user = await requireRouteAccess('/payroll');
  const supabase = await createClient();
  const params = await searchParams;

  const defaultWeek = format(startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekStart = params.week ?? defaultWeek;

  const { data: timesheets } = await supabase
    .from('timesheets')
    .select('*, user:users(full_name, email, ird_number)')
    .eq('week_start_date', weekStart)
    .in('status', ['approved', 'exported'])
    .order('created_at');

  const prevWeek = format(subWeeks(new Date(weekStart), 1), 'yyyy-MM-dd');
  const nextWeek = format(subWeeks(new Date(weekStart), -1), 'yyyy-MM-dd');

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Payroll Export</h1>
      <p className="text-slate-600 mb-6">Export approved timesheets for payroll processing</p>

      <div className="flex gap-2 mb-6">
        <Link href={`/payroll?week=${prevWeek}`} className="btn-secondary text-sm py-2 min-h-0">← Previous Week</Link>
        <Link href={`/payroll?week=${nextWeek}`} className="btn-secondary text-sm py-2 min-h-0">Next Week →</Link>
      </div>

      {!timesheets?.length ? (
        <EmptyState
          title="No approved timesheets"
          description={`No approved timesheets found for the week starting ${weekStart}.`}
        />
      ) : (
        <PayrollExport timesheets={timesheets} weekStartDate={weekStart} />
      )}
    </div>
  );
}
