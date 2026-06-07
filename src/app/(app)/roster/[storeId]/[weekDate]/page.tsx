import { requireRouteAccess } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { canViewRoster, canEditRoster } from '@/lib/permissions';
import { RosterGrid } from '@/components/roster/RosterGrid';
import { EmptyState } from '@/components/ui/EmptyState';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function WeeklyRosterPage({
  params,
}: {
  params: Promise<{ storeId: string; weekDate: string }>;
}) {
  const user = await requireRouteAccess('/roster');
  const { storeId, weekDate } = await params;

  if (!canViewRoster(user, storeId)) {
    redirect('/roster');
  }

  const supabase = await createClient();

  const { data: store } = await supabase.from('stores').select('id, name').eq('id', storeId).single();

  if (!store) {
    return <EmptyState title="Store not found" description="This store does not exist or has been deactivated." />;
  }

  const { data: shifts } = await supabase
    .from('shifts')
    .select('*, user:users(id, full_name)')
    .eq('store_id', storeId)
    .eq('week_start_date', weekDate)
    .order('scheduled_start');

  const { data: staff } = await supabase
    .from('users')
    .select('id, full_name')
    .eq('store_id', storeId)
    .in('role', ['team_member', 'two_ic'])
    .eq('is_active', true)
    .order('full_name');

  const canEdit = canEditRoster(user, storeId);

  return (
    <div>
      <div className="mb-6">
        <Link href="/roster" className="text-sm text-info hover:underline">← Back to Roster</Link>
        <h1 className="text-2xl font-bold mt-2">{store.name} Roster</h1>
      </div>

      {!staff?.length ? (
        <EmptyState
          title="No staff at this store"
          description="Assign team members to this store before building a roster."
        />
      ) : (
        <RosterGrid
          storeId={storeId}
          weekStartDate={weekDate}
          shifts={shifts ?? []}
          staff={staff ?? []}
          canEdit={canEdit}
        />
      )}
    </div>
  );
}
