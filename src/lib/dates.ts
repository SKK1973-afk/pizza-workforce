import { format, parseISO, isValid } from 'date-fns';

/**
 * Format a Postgres TIMETZ value (e.g. "09:00:00+12") for display.
 * Optionally combine with a shift date for timezone-aware formatting.
 */
export function formatShiftTime(time: string, shiftDate?: string): string {
  if (!time) return '—';

  if (shiftDate) {
    const combined = time.includes('T') ? time : `${shiftDate}T${time}`;
    const parsed = parseISO(combined);
    if (isValid(parsed)) return format(parsed, 'h:mm a');
  }

  const match = time.match(/^(\d{1,2}):(\d{2})/);
  if (match) {
    const hours = parseInt(match[1], 10);
    const mins = match[2];
    const period = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    return `${h12}:${mins} ${period}`;
  }

  const parsed = parseISO(time);
  if (isValid(parsed)) return format(parsed, 'h:mm a');

  return time;
}

export function formatShiftDate(date: string): string {
  const parsed = parseISO(date);
  if (!isValid(parsed)) return date;
  return format(parsed, 'EEEE, d MMM');
}

export function formatShiftDateShort(date: string): string {
  const parsed = parseISO(date);
  if (!isValid(parsed)) return date;
  return format(parsed, 'EEE d MMM');
}
