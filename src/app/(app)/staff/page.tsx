import { requireRouteAccess } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ROLE_LABELS } from '@/lib/permissions';
import type { UserRole } from '@/types';
import { getJoinedField } from '@/lib/supabase-helpers';
import { canViewWageRates } from '@/lib/permissions';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import Link from 'next/link';

export default async function StaffPage() {
  const user = await requireRouteAccess('/staff');
  const supabase = await createClient();

  let query = supabase
    .from('users')
    .select('id, full_name, email, role, store_id, contract_type, wage_rate, is_active, store:stores(name)')
    .eq('is_active', true)
    .order('full_name');

  if (user.role === 'store_manager') {
    query = query.eq('store_id', user.store_id!);
  } else if (user.role === 'area_manager' && user.area_store_ids?.length) {
    query = query.in('store_id', user.area_store_ids);
  }

  const { data: staff } = await query;
  const showWages = canViewWageRates(user.role);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Staff Directory</h1>
      <p className="text-slate-600 mb-6">{staff?.length ?? 0} active team members</p>

      {!staff?.length ? (
        <EmptyState title="No staff found" description="No active staff members match your access level." />
      ) : (
        <div className="space-y-2">
          {staff.map((member) => (
            <Link key={member.id} href={`/staff/${member.id}`} className="card block hover:border-info transition">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="font-semibold">{member.full_name}</p>
                  <p className="text-sm text-slate-500">{member.email}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <StatusBadge status="info">{ROLE_LABELS[member.role as UserRole] ?? member.role}</StatusBadge>
                  {getJoinedField(member.store, 'name') && (
                    <span className="text-slate-500">{getJoinedField(member.store, 'name')}</span>
                  )}
                  {showWages && member.wage_rate != null && (
                    <span className="font-medium">${member.wage_rate.toFixed(2)}/hr</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
