'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import type { Store } from '@/types';
import { StatusBadge } from '@/components/ui/StatusBadge';

export function StoreGeofenceManager({ stores: initialStores }: { stores: Store[] }) {
  const supabase = createClient();
  const router = useRouter();
  const [stores, setStores] = useState(initialStores);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [radius, setRadius] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function startEdit(store: Store) {
    setEditingId(store.id);
    setRadius(String(store.geofence_radius_meters));
    setError('');
  }

  async function handleSave(storeId: string) {
    const radiusNum = parseInt(radius, 10);
    if (isNaN(radiusNum) || radiusNum < 10 || radiusNum > 500) {
      setError('Radius must be between 10 and 500 metres.');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase
      .from('stores')
      .update({ geofence_radius_meters: radiusNum })
      .eq('id', storeId);

    if (updateError) {
      setError(updateError.message);
    } else {
      setStores((prev) =>
        prev.map((s) => (s.id === storeId ? { ...s, geofence_radius_meters: radiusNum } : s))
      );
      setEditingId(null);
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-breach bg-red-50 p-3 rounded-lg text-sm">{error}</p>}

      {stores.map((store) => (
        <div key={store.id} className="card">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{store.name}</h3>
                <StatusBadge status={store.is_active ? 'success' : 'danger'}>
                  {store.is_active ? 'Active' : 'Inactive'}
                </StatusBadge>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                {[store.address, store.city].filter(Boolean).join(', ') || 'No address'}
              </p>
              <p className="text-sm text-slate-600 mt-2">
                {store.latitude.toFixed(5)}, {store.longitude.toFixed(5)}
              </p>
            </div>

            {editingId === store.id ? (
              <div className="flex items-end gap-2">
                <div>
                  <label className="label">Geofence Radius (m)</label>
                  <input
                    type="number"
                    min="10"
                    max="500"
                    className="input w-32"
                    value={radius}
                    onChange={(e) => setRadius(e.target.value)}
                  />
                </div>
                <button onClick={() => handleSave(store.id)} disabled={loading} className="btn-primary text-sm py-2 min-h-0">
                  Save
                </button>
                <button onClick={() => setEditingId(null)} className="btn-secondary text-sm py-2 min-h-0">
                  Cancel
                </button>
              </div>
            ) : (
              <div className="text-right">
                <p className="text-sm text-slate-500">Geofence radius</p>
                <p className="text-lg font-semibold">{store.geofence_radius_meters}m</p>
                <button onClick={() => startEdit(store)} className="text-sm text-info mt-1 hover:underline">
                  Edit
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
