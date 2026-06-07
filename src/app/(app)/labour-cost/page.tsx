import { requireRouteAccess } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { LabourCostDashboard } from '@/components/labour/LabourCostDashboard';
import { format, startOfWeek } from 'date-fns';

export default async function LabourCostPage() {
  const user = await requireRouteAccess('/labour-cost');
  const supabase = await createClient();

  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  let timesheetQuery = supabase
    .from('timesheets')
    .select('gross_pay, store_id')
    .eq('week_start_date', weekStart);

  if (user.role === 'store_manager') {
    timesheetQuery = timesheetQuery.eq('store_id', user.store_id!);
  } else if (user.role === 'area_manager' && user.area_store_ids?.length) {
    timesheetQuery = timesheetQuery.in('store_id', user.area_store_ids);
  }

  const { data: timesheets } = await timesheetQuery;
  const totalWages = (timesheets ?? []).reduce((sum, ts) => sum + (ts.gross_pay ?? 0), 0);

  const { data: stores } = await supabase.from('stores').select('id, name').eq('is_active', true).order('name');

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Labour Cost</h1>
      <p className="text-slate-600 mb-6">Track labour cost as a percentage of revenue</p>
      <LabourCostDashboard
        initialTotalWages={totalWages}
        weekStart={weekStart}
        stores={stores ?? []}
        userStoreId={user.store_id}
      />
    </div>
  );
}
