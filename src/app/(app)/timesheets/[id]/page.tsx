import { requireRouteAccess } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { canApproveTimesheets } from '@/lib/permissions';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { TimesheetApproval } from '@/components/timesheets/TimesheetApproval';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { getJoinedField } from '@/lib/supabase-helpers';
import { notFound } from 'next/navigation';

export default async function TimesheetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRouteAccess('/timesheets');
  const { id } = await params;
  const supabase = await createClient();

  const { data: timesheet } = await supabase
    .from('timesheets')
    .select('*, user:users(id, full_name, email), store:stores(id, name)')
    .eq('id', id)
    .single();

  if (!timesheet) notFound();

  const canApprove = canApproveTimesheets(user, timesheet.store_id);

  return (
    <div>
      <Link href="/timesheets" className="text-sm text-info hover:underline">← Back to Timesheets</Link>
      <h1 className="text-2xl font-bold mt-2 mb-6">Timesheet Detail</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card space-y-4">
          <div>
            <p className="text-sm text-slate-500">Employee</p>
            <p className="font-semibold text-lg">{getJoinedField(timesheet.user, 'full_name')}</p>
            <p className="text-sm text-slate-500">{getJoinedField(timesheet.user, 'email')}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Store</p>
            <p className="font-medium">{getJoinedField(timesheet.store, 'name')}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Week Starting</p>
            <p className="font-medium">{format(parseISO(timesheet.week_start_date), 'd MMMM yyyy')}</p>
          </div>
          <div>
            <StatusBadge
              status={
                timesheet.status === 'approved' ? 'success' :
                timesheet.status === 'pending_approval' ? 'warning' : 'neutral'
              }
            >
              {timesheet.status.replace(/_/g, ' ')}
            </StatusBadge>
          </div>
        </div>

        <div className="card space-y-3">
          <h2 className="font-semibold">Hours Breakdown</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Ordinary Hours</dt>
              <dd className="font-medium">{timesheet.ordinary_hours}h</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Overtime Hours</dt>
              <dd className="font-medium">{timesheet.overtime_hours}h</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Public Holiday Hours</dt>
              <dd className="font-medium">{timesheet.public_holiday_hours}h</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Paid Breaks</dt>
              <dd>{timesheet.paid_break_minutes} min</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Unpaid Breaks</dt>
              <dd>{timesheet.unpaid_break_minutes} min</dd>
            </div>
            {timesheet.gross_pay != null && (
              <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold">
                <dt>Gross Pay</dt>
                <dd>${timesheet.gross_pay.toFixed(2)}</dd>
              </div>
            )}
          </dl>
          {timesheet.notes && (
            <div className="pt-2 border-t border-slate-100">
              <p className="text-sm text-slate-500">Notes</p>
              <p className="text-sm mt-1">{timesheet.notes}</p>
            </div>
          )}
        </div>
      </div>

      {canApprove && timesheet.status === 'pending_approval' && (
        <div className="mt-6">
          <TimesheetApproval timesheetId={timesheet.id} approverId={user.id} />
        </div>
      )}
    </div>
  );
}
