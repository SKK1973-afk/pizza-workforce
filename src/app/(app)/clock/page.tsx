import { requireRouteAccess } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ClockInOut } from '@/components/clock/ClockInOut';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Store } from '@/types';

export default async function ClockPage() {
  const user = await requireRouteAccess('/clock');
  const supabase = await createClient();

  if (!user.store_id) {
    return (
      <EmptyState
        title="No store assigned"
        description="Your account is not linked to a store. Please contact your manager or system administrator."
      />
    );
  }

  const { data: store } = await supabase.from('stores').select('*').eq('id', user.store_id).single();

  if (!store) {
    return <EmptyState title="Store not found" description="The store linked to your account could not be found." />;
  }

  return <ClockInOut user={user} store={store as Store} />;
}
