import { requireRouteAccess } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { canAccessStore } from '@/lib/permissions';
import { EmptyState } from '@/components/ui/EmptyState';
import Link from 'next/link';
import { format, startOfWeek } from 'date-fns';

export default async function RosterPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string }>;
}) {
  const user = await requireRouteAccess('/roster');
  const supabase = await createClient();
  const params = await searchParams;

  const { data: allStores } = await supabase
    .from('stores')
    .select('id, name')
    .eq('is_active', true)
    .order('name');

  const accessibleStores = (allStores ?? []).filter((s) => canAccessStore(user, s.id));

  if (accessibleStores.length === 0) {
    return (
      <EmptyState
        title="No stores available"
        description="You don't have access to any stores. Contact your administrator."
      />
    );
  }

  const selectedStoreId =
    params.store && accessibleStores.some((s) => s.id === params.store)
      ? params.store
      : user.store_id && accessibleStores.some((s) => s.id === user.store_id)
        ? user.store_id
        : accessibleStores[0].id;

  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const selectedStore = accessibleStores.find((s) => s.id === selectedStoreId)!;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Roster</h1>
      <p className="text-slate-600 mb-6">View and manage weekly staff rosters</p>

      {accessibleStores.length > 1 && (
        <div className="card mb-6">
          <label className="label">Select Store</label>
          <div className="flex flex-wrap gap-2">
            {accessibleStores.map((store) => (
              <Link
                key={store.id}
                href={`/roster?store=${store.id}`}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  store.id === selectedStoreId
                    ? 'bg-info text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {store.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h2 className="text-lg font-semibold mb-2">{selectedStore.name}</h2>
        <p className="text-sm text-slate-500 mb-4">
          Current week starting {format(new Date(weekStart), 'd MMM yyyy')}
        </p>
        <Link href={`/roster/${selectedStoreId}/${weekStart}`} className="btn-primary inline-block">
          View Weekly Roster
        </Link>
      </div>
    </div>
  );
}
