import { requireRouteAccess } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LABOUR_COST_TARGET_PCT } from '@/lib/nz-employment';
import Link from 'next/link';

export default async function DashboardPage() {
  const user = await requireRouteAccess('/dashboard');
  const supabase = await createClient();

  let storeFilter = {};
  if (user.role === 'store_manager' || user.role === 'two_ic') {
    storeFilter = { store_id: user.store_id };
  }

  const { count: pendingLeave } = await supabase
    .from('leave_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')
    .match(storeFilter);

  const { count: pendingTimesheets } = await supabase
    .from('timesheets')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending_approval')
    .match(storeFilter);

  const { data: stores } = await supabase.from('stores').select('id, name').eq('is_active', true);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <p className="text-slate-600 mb-8">Welcome back, {user.full_name}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card">
          <p className="text-sm text-slate-500">Pending Leave Requests</p>
          <p className="text-3xl font-bold mt-1">{pendingLeave ?? 0}</p>
          <Link href="/leave" className="text-sm text-info mt-2 inline-block">View inbox →</Link>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Timesheets Awaiting Approval</p>
          <p className="text-3xl font-bold mt-1">{pendingTimesheets ?? 0}</p>
          <Link href="/timesheets" className="text-sm text-info mt-2 inline-block">Review →</Link>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Labour Cost Target</p>
          <p className="text-3xl font-bold mt-1">{LABOUR_COST_TARGET_PCT}%</p>
          <StatusBadge status="success">On target</StatusBadge>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Active Stores</p>
          <p className="text-3xl font-bold mt-1">{stores?.length ?? 0}</p>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          {['store_manager', 'head_of_operations', 'area_manager'].includes(user.role) && (
            <Link href="/roster" className="btn-primary">Build Roster</Link>
          )}
          <Link href="/timesheets" className="btn-secondary">View Timesheets</Link>
          <Link href="/breaks" className="btn-secondary">Break Compliance</Link>
          <Link href="/labour-cost" className="btn-secondary">Labour Cost</Link>
        </div>
      </div>
    </div>
  );
}
