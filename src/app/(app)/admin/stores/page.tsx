import { requireRouteAccess } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { StoreGeofenceManager } from '@/components/admin/StoreGeofenceManager';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Store } from '@/types';

export default async function AdminStoresPage() {
  await requireRouteAccess('/admin/stores');
  const supabase = await createClient();

  const { data: stores } = await supabase
    .from('stores')
    .select('*')
    .order('name');

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Stores &amp; Geofence</h1>
      <p className="text-slate-600 mb-6">Manage store locations and clock-in geofence radius</p>

      {!stores?.length ? (
        <EmptyState title="No stores" description="Add stores to enable geofence clock-in." />
      ) : (
        <StoreGeofenceManager stores={stores as Store[]} />
      )}
    </div>
  );
}
