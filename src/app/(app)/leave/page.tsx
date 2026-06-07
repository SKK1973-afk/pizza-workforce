import { requireRouteAccess } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { LeaveInbox } from '@/components/leave/LeaveInbox';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { format, parseISO } from 'date-fns';

export default async function LeaveInboxPage() {
  const user = await requireRouteAccess('/leave');
  const supabase = await createClient();

  let pendingQuery = supabase
    .from('leave_requests')
    .select('*, user:users(full_name)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  let recentQuery = supabase
    .from('leave_requests')
    .select('*, user:users(full_name)')
    .neq('status', 'pending')
    .order('reviewed_at', { ascending: false })
    .limit(20);

  if (user.role === 'store_manager' || user.role === 'two_ic') {
    pendingQuery = pendingQuery.eq('store_id', user.store_id!);
    recentQuery = recentQuery.eq('store_id', user.store_id!);
  } else if (user.role === 'area_manager' && user.area_store_ids?.length) {
    pendingQuery = pendingQuery.in('store_id', user.area_store_ids);
    recentQuery = recentQuery.in('store_id', user.area_store_ids);
  }

  const [{ data: pending }, { data: recent }] = await Promise.all([pendingQuery, recentQuery]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Leave Inbox</h1>
      <p className="text-slate-600 mb-6">Review and action leave requests from your team</p>

      <h2 className="text-lg font-semibold mb-4">
        Pending ({pending?.length ?? 0})
      </h2>

      {!pending?.length ? (
        <EmptyState
          title="No pending requests"
          description="All leave requests have been actioned. New requests will appear here."
        />
      ) : (
        <LeaveInbox requests={pending} reviewerId={user.id} />
      )}

      {recent && recent.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold mb-4">Recently Actioned</h2>
          <div className="space-y-3">
            {recent.map((req) => (
              <div key={req.id} className="card py-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="font-medium">{req.user?.full_name}</p>
                    <p className="text-sm text-slate-500">
                      {format(parseISO(req.start_date), 'd MMM')} – {format(parseISO(req.end_date), 'd MMM yyyy')}
                    </p>
                  </div>
                  <StatusBadge status={req.status === 'approved' ? 'success' : 'danger'}>
                    {req.status}
                  </StatusBadge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
