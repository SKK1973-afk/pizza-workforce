import { requireRouteAccess } from '@/lib/auth';
import { LeaveApplicationForm } from '@/components/leave/LeaveApplicationForm';

export default async function LeaveApplyPage() {
  const user = await requireRouteAccess('/leave/apply');

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-2">Apply for Leave</h1>
      <p className="text-slate-600 mb-6">Submit a leave request for manager approval</p>
      <LeaveApplicationForm userId={user.id} storeId={user.store_id} />
    </div>
  );
}
