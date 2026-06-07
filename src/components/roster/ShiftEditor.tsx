'use client';

import { useState } from 'react';
import type { Shift, ShiftType } from '@/types';
import { X } from 'lucide-react';

const SHIFT_TYPES: ShiftType[] = ['morning', 'evening', 'close', 'split'];

const PRESETS: Record<ShiftType, { start: string; end: string }> = {
  morning: { start: '09:00', end: '17:00' },
  evening: { start: '14:00', end: '22:00' },
  close: { start: '17:00', end: '23:00' },
  split: { start: '11:00', end: '20:00' },
};

interface ShiftEditorProps {
  storeId: string;
  weekStartDate: string;
  userId: string;
  userName: string;
  shiftDate: string;
  existingShift?: Shift;
  onClose: () => void;
  onSaved: () => void;
}

export function ShiftEditor({
  storeId,
  weekStartDate,
  userId,
  userName,
  shiftDate,
  existingShift,
  onClose,
  onSaved,
}: ShiftEditorProps) {
  const [shiftType, setShiftType] = useState<ShiftType>(existingShift?.shift_type || 'morning');
  const [start, setStart] = useState(extractTime(existingShift?.scheduled_start) || '09:00');
  const [end, setEnd] = useState(extractTime(existingShift?.scheduled_end) || '17:00');
  const [notes, setNotes] = useState(existingShift?.notes || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function extractTime(timetz?: string): string {
    if (!timetz) return '';
    const match = timetz.match(/^(\d{1,2}):(\d{2})/);
    return match ? `${match[1].padStart(2, '0')}:${match[2]}` : '';
  }

  function applyPreset(type: ShiftType) {
    setShiftType(type);
    setStart(PRESETS[type].start);
    setEnd(PRESETS[type].end);
  }

  async function handleSave() {
    setLoading(true);
    setError('');
    const payload = {
      store_id: storeId,
      user_id: userId,
      shift_date: shiftDate,
      week_start_date: weekStartDate,
      scheduled_start: start,
      scheduled_end: end,
      shift_type: shiftType,
      notes: notes || null,
    };

    try {
      const url = existingShift ? `/api/shifts/${existingShift.id}` : '/api/shifts';
      const res = await fetch(url, {
        method: existingShift ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    }
    setLoading(false);
  }

  async function handleDelete() {
    if (!existingShift || !confirm('Delete this shift?')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/shifts/${existingShift.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold">{existingShift ? 'Edit Shift' : 'Add Shift'}</h3>
            <p className="text-sm text-slate-500">{userName} · {shiftDate}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">Shift type</label>
            <div className="flex flex-wrap gap-2">
              {SHIFT_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => applyPreset(t)}
                  className={`px-3 py-1.5 rounded-lg text-sm capitalize border ${
                    shiftType === t ? 'bg-info text-white border-info' : 'border-slate-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="start">Start</label>
              <input id="start" type="time" className="input" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="end">End</label>
              <input id="end" type="time" className="input" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="notes">Notes (optional)</label>
            <input id="notes" className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. training shift" />
          </div>

          {error && <p className="text-sm text-breach bg-red-50 p-2 rounded">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button onClick={handleSave} disabled={loading} className="btn-primary flex-1">
              {loading ? 'Saving...' : existingShift ? 'Update Shift' : 'Add Shift'}
            </button>
            {existingShift && (
              <button onClick={handleDelete} disabled={loading} className="btn-danger">
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
