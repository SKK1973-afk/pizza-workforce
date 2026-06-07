import { requireRouteAccess } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ROLE_LABELS, canViewWageRates } from '@/lib/permissions';
import type { UserRole } from '@/types';
import { getJoinedField } from '@/lib/supabase-helpers';
import { formatShiftDateShort } from '@/lib/dates';
import { StatusBadge } from '@/components/ui/StatusBadge';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { notFound } from 'next/navigation';

export default async function StaffProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRouteAccess('/staff');
  const { id } = await params;
  const supabase = await createClient();

  const { data: member } = await supabase
    .from('users')
    .select('*, store:stores(name, city)')
    .eq('id', id)
    .single();

  if (!member) notFound();

  const showWages = canViewWageRates(user.role);

  const { data: recentShifts } = await supabase
    .from('shifts')
    .select('shift_date, scheduled_start, scheduled_end, shift_type')
    .eq('user_id', id)
    .order('shift_date', { ascending: false })
    .limit(5);

  return (
    <div>
      <Link href="/staff" className="text-sm text-info hover:underline">← Back to Staff</Link>
      <div className="mt-4 mb-8">
        <h1 className="text-2xl font-bold">{member.full_name}</h1>
        <p className="text-slate-600">{member.email}</p>
        <div className="mt-2">
          <StatusBadge status={member.is_active ? 'success' : 'danger'}>
            {member.is_active ? 'Active' : 'Inactive'}
          </StatusBadge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card space-y-4">
          <h2 className="font-semibold">Employment Details</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Role</dt>
              <dd>{ROLE_LABELS[member.role as UserRole] ?? member.role}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Store</dt>
              <dd>{getJoinedField(member.store, 'name') ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Contract</dt>
              <dd className="capitalize">{member.contract_type?.replace(/_/g, ' ') ?? '—'}</dd>
            </div>
            {showWages && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Wage Rate</dt>
                <dd className="font-medium">
                  {member.wage_rate != null ? `$${member.wage_rate.toFixed(2)}/hr` : '—'}
                </dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-slate-500">KiwiSaver</dt>
              <dd>{member.kiwisaver_rate}%</dd>
            </div>
            {member.start_date && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Start Date</dt>
                <dd>{format(parseISO(member.start_date), 'd MMM yyyy')}</dd>
              </div>
            )}
            {member.phone && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Phone</dt>
                <dd>{member.phone}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="card">
          <h2 className="font-semibold mb-4">Recent Shifts</h2>
          {!recentShifts?.length ? (
            <p className="text-sm text-slate-500">No recent shifts on record.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {recentShifts.map((shift, i) => (
                <li key={i} className="flex justify-between border-b border-slate-100 pb-2">
                  <span>{formatShiftDateShort(shift.shift_date)}</span>
                  <span className="text-slate-500 capitalize">
                    {shift.shift_type ?? 'shift'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
