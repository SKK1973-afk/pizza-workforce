'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { differenceInBusinessDays, parseISO } from 'date-fns';
import type { LeaveType } from '@/types';

const LEAVE_TYPES: { value: LeaveType; label: string }[] = [
  { value: 'annual', label: 'Annual Leave' },
  { value: 'sick', label: 'Sick Leave' },
  { value: 'bereavement', label: 'Bereavement Leave' },
  { value: 'unpaid', label: 'Unpaid Leave' },
  { value: 'other', label: 'Other' },
];

export function LeaveApplicationForm({ userId, storeId }: { userId: string; storeId: string | null }) {
  const supabase = createClient();
  const router = useRouter();
  const [leaveType, setLeaveType] = useState<LeaveType>('annual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!storeId) {
      setError('Your account is not linked to a store.');
      return;
    }
    if (!startDate || !endDate) {
      setError('Please select start and end dates.');
      return;
    }

    const days = differenceInBusinessDays(parseISO(endDate), parseISO(startDate)) + 1;
    if (days <= 0) {
      setError('End date must be on or after start date.');
      return;
    }

    setLoading(true);
    setError('');

    const { error: insertError } = await supabase.from('leave_requests').insert({
      user_id: userId,
      store_id: storeId,
      leave_type: leaveType,
      start_date: startDate,
      end_date: endDate,
      days_requested: days,
      notes: notes || null,
      status: 'pending',
    });

    if (insertError) {
      setError(insertError.message);
    } else {
      setSuccess(true);
      router.refresh();
    }
    setLoading(false);
  }

  if (!storeId) {
    return (
      <div className="card text-center py-8">
        <p className="text-slate-600">Your account is not linked to a store. Contact your manager.</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="card text-center py-8">
        <p className="text-compliant font-semibold text-lg">Leave request submitted</p>
        <p className="text-slate-500 mt-2 text-sm">Your manager will review your request shortly.</p>
        <button onClick={() => { setSuccess(false); setStartDate(''); setEndDate(''); setNotes(''); }} className="btn-secondary mt-4">
          Submit Another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      {error && <p className="text-breach bg-red-50 p-3 rounded-lg text-sm">{error}</p>}

      <div>
        <label className="label">Leave Type</label>
        <select className="input" value={leaveType} onChange={(e) => setLeaveType(e.target.value as LeaveType)}>
          {LEAVE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Start Date</label>
          <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
        </div>
        <div>
          <label className="label">End Date</label>
          <input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
        </div>
      </div>

      <div>
        <label className="label">Notes (optional)</label>
        <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional details..." />
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-40">
        Submit Request
      </button>
    </form>
  );
}
