import { requireRouteAccess } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { EmptyState } from '@/components/ui/EmptyState';

export default async function LeaveBalancesPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const user = await requireRouteAccess('/leave/balances');
  const supabase = await createClient();
  const params = await searchParams;
  const year = parseInt(params.year ?? String(new Date().getFullYear()), 10);

  let balanceQuery = supabase
    .from('leave_balances')
    .select('*, user:users(full_name, store_id)')
    .eq('year', year)
    .order('leave_type');

  if (user.role === 'team_member' || user.role === 'two_ic') {
    balanceQuery = balanceQuery.eq('user_id', user.id);
  } else if (user.role === 'store_manager') {
    const { data: storeStaff } = await supabase.from('users').select('id').eq('store_id', user.store_id!);
    const ids = storeStaff?.map((s) => s.id) ?? [];
    balanceQuery = balanceQuery.in('user_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);
  } else if (user.role === 'area_manager' && user.area_store_ids?.length) {
    const { data: areaStaff } = await supabase.from('users').select('id').in('store_id', user.area_store_ids);
    const ids = areaStaff?.map((s) => s.id) ?? [];
    balanceQuery = balanceQuery.in('user_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);
  }

  const { data: balances } = await balanceQuery;

  const showEmployee = user.role !== 'team_member';

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Leave Balances</h1>
      <p className="text-slate-600 mb-6">{year} leave entitlements and usage</p>

      {!balances?.length ? (
        <EmptyState
          title="No balance data"
          description="Leave balances will appear here once configured by HR."
        />
      ) : (
        <div className="overflow-x-auto card p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {showEmployee && <th className="text-left p-3 font-medium">Employee</th>}
                <th className="text-left p-3 font-medium">Leave Type</th>
                <th className="text-right p-3 font-medium">Accrued</th>
                <th className="text-right p-3 font-medium">Used</th>
                <th className="text-right p-3 font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              {balances.map((bal) => (
                <tr key={bal.id} className="border-b border-slate-100">
                  {showEmployee && <td className="p-3">{bal.user?.full_name ?? '—'}</td>}
                  <td className="p-3 capitalize">{bal.leave_type}</td>
                  <td className="p-3 text-right">{bal.accrued_days}</td>
                  <td className="p-3 text-right">{bal.used_days}</td>
                  <td className="p-3 text-right font-medium">{bal.balance_days}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
