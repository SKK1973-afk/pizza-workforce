'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export function TimesheetApproval({ timesheetId, approverId }: { timesheetId: string; approverId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleApprove() {
    setLoading(true);
    setError('');
    const { error: updateError } = await supabase
      .from('timesheets')
      .update({
        status: 'approved',
        approved_by: approverId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', timesheetId);

    if (updateError) setError(updateError.message);
    else router.refresh();
    setLoading(false);
  }

  return (
    <div className="card">
      <h2 className="font-semibold mb-3">Approval</h2>
      {error && <p className="text-breach bg-red-50 p-3 rounded-lg text-sm mb-3">{error}</p>}
      <button onClick={handleApprove} disabled={loading} className="btn-success disabled:opacity-40">
        Approve Timesheet
      </button>
    </div>
  );
}
