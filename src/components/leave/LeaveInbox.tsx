'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { LeaveRequest, LeaveType, User } from '@/types';
import { format, parseISO } from 'date-fns';

const LEAVE_LABELS: Record<LeaveType, string> = {
  annual: 'Annual',
  sick: 'Sick',
  bereavement: 'Bereavement',
  unpaid: 'Unpaid',
  other: 'Other',
};

interface LeaveInboxProps {
  requests: (LeaveRequest & { user?: Pick<User, 'full_name'> })[];
  reviewerId: string;
}

export function LeaveInbox({ requests: initialRequests, reviewerId }: LeaveInboxProps) {
  const supabase = createClient();
  const router = useRouter();
  const [requests, setRequests] = useState(initialRequests);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [declineId, setDeclineId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [error, setError] = useState('');

  async function handleApprove(id: string) {
    setLoadingId(id);
    setError('');
    const { error: updateError } = await supabase
      .from('leave_requests')
      .update({
        status: 'approved',
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setRequests((prev) => prev.filter((r) => r.id !== id));
      router.refresh();
    }
    setLoadingId(null);
  }

  async function handleDecline(id: string) {
    if (!declineReason.trim()) {
      setError('Please provide a reason for declining.');
      return;
    }
    setLoadingId(id);
    setError('');
    const { error: updateError } = await supabase
      .from('leave_requests')
      .update({
        status: 'declined',
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        decline_reason: declineReason,
      })
      .eq('id', id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setRequests((prev) => prev.filter((r) => r.id !== id));
      setDeclineId(null);
      setDeclineReason('');
      router.refresh();
    }
    setLoadingId(null);
  }

  if (requests.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-breach bg-red-50 p-3 rounded-lg text-sm">{error}</p>}

      {requests.map((req) => (
        <div key={req.id} className="card">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h3 className="font-semibold">{req.user?.full_name ?? 'Unknown staff'}</h3>
              <p className="text-sm text-slate-500 mt-1">
                {LEAVE_LABELS[req.leave_type]} · {req.days_requested} day{req.days_requested !== 1 ? 's' : ''}
              </p>
              <p className="text-sm mt-1">
                {format(parseISO(req.start_date), 'd MMM yyyy')} – {format(parseISO(req.end_date), 'd MMM yyyy')}
              </p>
              {req.notes && <p className="text-sm text-slate-600 mt-2">{req.notes}</p>}
              <div className="mt-2">
                <StatusBadge status="warning">Pending</StatusBadge>
              </div>
            </div>

            {declineId === req.id ? (
              <div className="w-full sm:w-64 space-y-2">
                <textarea
                  className="input text-sm"
                  rows={2}
                  placeholder="Reason for declining..."
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDecline(req.id)}
                    disabled={loadingId === req.id}
                    className="btn-danger flex-1 text-sm py-2 min-h-0"
                  >
                    Confirm Decline
                  </button>
                  <button
                    onClick={() => { setDeclineId(null); setDeclineReason(''); }}
                    className="btn-secondary flex-1 text-sm py-2 min-h-0"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => handleApprove(req.id)}
                  disabled={loadingId === req.id}
                  className="btn-success text-sm py-2 min-h-0"
                >
                  Approve
                </button>
                <button
                  onClick={() => setDeclineId(req.id)}
                  disabled={loadingId === req.id}
                  className="btn-danger text-sm py-2 min-h-0"
                >
                  Decline
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
