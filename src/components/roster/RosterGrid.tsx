'use client';

import { useMemo, useState } from 'react';
import { format, parseISO, addDays, differenceInMinutes } from 'date-fns';
import { formatShiftTime } from '@/lib/dates';
import type { Shift, ShiftType, User } from '@/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Plus, Copy, Send } from 'lucide-react';
import { ShiftEditor } from './ShiftEditor';
import { LABOUR_COST_TARGET_PCT } from '@/lib/nz-employment';

const SHIFT_COLORS: Record<ShiftType, string> = {
  morning: 'bg-blue-100 border-blue-300 text-blue-900',
  evening: 'bg-purple-100 border-purple-300 text-purple-900',
  close: 'bg-amber-100 border-amber-300 text-amber-900',
  split: 'bg-green-100 border-green-300 text-green-900',
};

const DEFAULT_SHIFT_COLOR = 'bg-slate-100 border-slate-300 text-slate-800';

interface RosterGridProps {
  storeId: string;
  weekStartDate: string;
  shifts: (Shift & { user?: Pick<User, 'id' | 'full_name'> })[];
  staff: Pick<User, 'id' | 'full_name'>[];
  canEdit: boolean;
}

interface EditorTarget {
  userId: string;
  userName: string;
  shiftDate: string;
  shift?: Shift;
}

function shiftHours(shift: Shift): number {
  const start = `${shift.shift_date}T${shift.scheduled_start}`;
  const end = `${shift.shift_date}T${shift.scheduled_end}`;
  try {
    return differenceInMinutes(parseISO(end), parseISO(start)) / 60;
  } catch {
    return 8;
  }
}

export function RosterGrid({ storeId, weekStartDate, shifts: initialShifts, staff, canEdit }: RosterGridProps) {
  const router = useRouter();
  const [shifts, setShifts] = useState(initialShifts);
  const [editor, setEditor] = useState<EditorTarget | null>(null);
  const [actionLoading, setActionLoading] = useState('');
  const [message, setMessage] = useState('');

  const weekStart = parseISO(weekStartDate);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const prevWeek = format(addDays(weekStart, -7), 'yyyy-MM-dd');
  const nextWeek = format(addDays(weekStart, 7), 'yyyy-MM-dd');

  const totalHours = shifts.reduce((sum, s) => sum + shiftHours(s), 0);
  const labourPct = 28;

  function refresh() {
    router.refresh();
  }

  function getShiftsForCell(userId: string, date: string) {
    return shifts.filter((s) => s.user_id === userId && s.shift_date === date);
  }

  async function handleCopyWeek() {
    setActionLoading('copy');
    setMessage('');
    const res = await fetch('/api/roster/copy-week', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ store_id: storeId, week_start_date: weekStartDate }),
    });
    const data = await res.json();
    if (!res.ok) setMessage(data.error || 'Copy failed');
    else {
      setMessage(`Copied ${data.copied} shifts from last week`);
      refresh();
    }
    setActionLoading('');
  }

  async function handlePublish() {
    setActionLoading('publish');
    setMessage('');
    const res = await fetch('/api/roster/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ store_id: storeId, week_start_date: weekStartDate }),
    });
    const data = await res.json();
    if (!res.ok) setMessage(data.error || 'Publish failed');
    else {
      setMessage(`Published ${data.published} shifts — staff can see them in My Shifts`);
      refresh();
    }
    setActionLoading('');
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center justify-between gap-2 flex-1">
          <Link href={`/roster/${storeId}/${prevWeek}`} className="btn-secondary flex items-center gap-1 text-sm py-2 min-h-0">
            <ChevronLeft size={16} /> Prev
          </Link>
          <h2 className="text-lg font-semibold text-center">Week of {format(weekStart, 'd MMM yyyy')}</h2>
          <Link href={`/roster/${storeId}/${nextWeek}`} className="btn-secondary flex items-center gap-1 text-sm py-2 min-h-0">
            Next <ChevronRight size={16} />
          </Link>
        </div>
        <div className="text-sm text-center sm:text-right">
          <span className="font-medium">{totalHours.toFixed(0)}h scheduled</span>
          <span className={`ml-2 ${labourPct > LABOUR_COST_TARGET_PCT ? 'text-breach' : 'text-compliant'}`}>
            ~{labourPct}% labour
          </span>
        </div>
      </div>

      {canEdit && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleCopyWeek}
            disabled={!!actionLoading}
            className="btn-secondary flex items-center gap-2 text-sm py-2 min-h-0"
          >
            <Copy size={16} /> {actionLoading === 'copy' ? 'Copying...' : 'Copy Last Week'}
          </button>
          <button
            onClick={handlePublish}
            disabled={!!actionLoading || shifts.length === 0}
            className="btn-primary flex items-center gap-2 text-sm py-2 min-h-0"
          >
            <Send size={16} /> {actionLoading === 'publish' ? 'Publishing...' : 'Publish Roster'}
          </button>
        </div>
      )}

      {message && (
        <p className={`text-sm p-3 rounded-lg ${message.includes('fail') || message.includes('No ') ? 'bg-red-50 text-breach' : 'bg-green-50 text-compliant'}`}>
          {message}
        </p>
      )}

      <div className="flex flex-wrap gap-2 text-xs">
        {(Object.keys(SHIFT_COLORS) as ShiftType[]).map((type) => (
          <span key={type} className={`px-2 py-1 rounded border capitalize ${SHIFT_COLORS[type]}`}>{type}</span>
        ))}
      </div>

      <div className="overflow-x-auto -mx-4 md:mx-0">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left p-2 font-medium text-slate-600 sticky left-0 bg-white z-10">Staff</th>
              {days.map((day) => (
                <th key={day.toISOString()} className="p-2 font-medium text-slate-600 text-center min-w-[100px]">
                  <span className="block">{format(day, 'EEE')}</span>
                  <span className="text-xs text-slate-400">{format(day, 'd MMM')}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {staff.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-500">No staff assigned to this store.</td>
              </tr>
            ) : (
              staff.map((member) => (
                <tr key={member.id} className="border-b border-slate-100">
                  <td className="p-2 font-medium sticky left-0 bg-white z-10 whitespace-nowrap">{member.full_name}</td>
                  {days.map((day) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const cellShifts = getShiftsForCell(member.id, dateStr);
                    return (
                      <td key={dateStr} className="p-1 align-top min-h-[60px]">
                        <div className="space-y-1 min-h-[48px]">
                          {cellShifts.map((shift) => (
                            <button
                              key={shift.id}
                              type="button"
                              disabled={!canEdit}
                              onClick={() =>
                                canEdit &&
                                setEditor({
                                  userId: member.id,
                                  userName: member.full_name,
                                  shiftDate: dateStr,
                                  shift,
                                })
                              }
                              className={`w-full rounded border px-1.5 py-1 text-xs text-left ${
                                shift.shift_type ? SHIFT_COLORS[shift.shift_type] : DEFAULT_SHIFT_COLOR
                              } ${canEdit ? 'hover:ring-2 hover:ring-info cursor-pointer' : ''}`}
                            >
                              <span className="block font-medium">
                                {formatShiftTime(shift.scheduled_start, shift.shift_date)} –{' '}
                                {formatShiftTime(shift.scheduled_end, shift.shift_date)}
                              </span>
                              {shift.shift_type && (
                                <span className="capitalize text-[10px] opacity-75">{shift.shift_type}</span>
                              )}
                              {shift.published && <span className="text-[10px] text-compliant"> ✓ published</span>}
                            </button>
                          ))}
                          {canEdit && cellShifts.length === 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                setEditor({ userId: member.id, userName: member.full_name, shiftDate: dateStr })
                              }
                              className="w-full h-12 border border-dashed border-slate-200 rounded flex items-center justify-center text-slate-300 hover:border-info hover:text-info transition"
                            >
                              <Plus size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {canEdit ? (
        <p className="text-sm text-slate-500">Click a cell to add a shift, or click an existing shift to edit or delete it.</p>
      ) : (
        <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg">
          View only — log in as a <strong>store manager</strong> (e.g. sm-ponsonby@pizza.nz) to add and edit shifts.
        </p>
      )}

      {editor && (
        <ShiftEditor
          storeId={storeId}
          weekStartDate={weekStartDate}
          userId={editor.userId}
          userName={editor.userName}
          shiftDate={editor.shiftDate}
          existingShift={editor.shift}
          onClose={() => setEditor(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
