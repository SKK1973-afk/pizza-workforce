'use client';

import { useMemo } from 'react';
import { format, parseISO, addDays } from 'date-fns';
import { formatShiftTime } from '@/lib/dates';
import type { Shift, ShiftType, User } from '@/types';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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

export function RosterGrid({ storeId, weekStartDate, shifts, staff, canEdit }: RosterGridProps) {
  const weekStart = parseISO(weekStartDate);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const prevWeek = format(addDays(weekStart, -7), 'yyyy-MM-dd');
  const nextWeek = format(addDays(weekStart, 7), 'yyyy-MM-dd');

  function getShiftsForCell(userId: string, date: string) {
    return shifts.filter((s) => s.user_id === userId && s.shift_date === date);
  }

  function formatTime(time: string, shiftDate: string) {
    return formatShiftTime(time, shiftDate);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Link href={`/roster/${storeId}/${prevWeek}`} className="btn-secondary flex items-center gap-1 text-sm py-2 min-h-0">
          <ChevronLeft size={16} /> Prev
        </Link>
        <h2 className="text-lg font-semibold text-center">
          Week of {format(weekStart, 'd MMM yyyy')}
        </h2>
        <Link href={`/roster/${storeId}/${nextWeek}`} className="btn-secondary flex items-center gap-1 text-sm py-2 min-h-0">
          Next <ChevronRight size={16} />
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {(Object.keys(SHIFT_COLORS) as ShiftType[]).map((type) => (
          <span key={type} className={`px-2 py-1 rounded border capitalize ${SHIFT_COLORS[type]}`}>
            {type}
          </span>
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
                <td colSpan={8} className="p-8 text-center text-slate-500">
                  No staff assigned to this store.
                </td>
              </tr>
            ) : (
              staff.map((member) => (
                <tr key={member.id} className="border-b border-slate-100">
                  <td className="p-2 font-medium sticky left-0 bg-white z-10 whitespace-nowrap">
                    {member.full_name}
                  </td>
                  {days.map((day) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const cellShifts = getShiftsForCell(member.id, dateStr);
                    return (
                      <td key={dateStr} className="p-1 align-top">
                        {cellShifts.length === 0 ? (
                          <span className="text-slate-300 text-xs">—</span>
                        ) : (
                          <div className="space-y-1">
                            {cellShifts.map((shift) => (
                              <div
                                key={shift.id}
                                className={`rounded border px-1.5 py-1 text-xs ${
                                  shift.shift_type ? SHIFT_COLORS[shift.shift_type] : DEFAULT_SHIFT_COLOR
                                }`}
                              >
                                <span className="block font-medium">
                                  {formatTime(shift.scheduled_start, shift.shift_date)} – {formatTime(shift.scheduled_end, shift.shift_date)}
                                </span>
                                {shift.shift_type && (
                                  <span className="capitalize text-[10px] opacity-75">{shift.shift_type}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {canEdit && (
        <p className="text-sm text-slate-500">
          Roster editing will be available in a future update. Contact system admin for changes.
        </p>
      )}
    </div>
  );
}
