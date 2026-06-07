'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format, startOfWeek } from 'date-fns';
import { RefreshCw } from 'lucide-react';

export function GenerateTimesheets({ storeId }: { storeId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  async function handleGenerate() {
    setLoading(true);
    setMessage('');
    const res = await fetch('/api/timesheets/sync-store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ store_id: storeId, week_start_date: weekStart }),
    });
    const data = await res.json();
    if (!res.ok) setMessage(data.error || 'Generation failed');
    else {
      setMessage(`Generated ${data.synced} timesheet(s) from clock events`);
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <p className="font-medium">Generate from clock events</p>
        <p className="text-sm text-slate-500">Build timesheets for this week from staff clock-in/out data</p>
      </div>
      <button onClick={handleGenerate} disabled={loading} className="btn-primary flex items-center gap-2">
        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        {loading ? 'Generating...' : 'Generate Timesheets'}
      </button>
      {message && <p className="text-sm text-slate-600 sm:col-span-2">{message}</p>}
    </div>
  );
}
