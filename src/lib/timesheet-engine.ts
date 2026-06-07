import { parseISO, differenceInMinutes, startOfWeek, format } from 'date-fns';
import type { ClockEvent } from '@/types';
import { calculatePay, OVERTIME_THRESHOLD_HOURS } from '@/lib/nz-employment';

export function getWeekStart(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

interface DayHours {
  paidHours: number;
  paidBreakMinutes: number;
  unpaidBreakMinutes: number;
}

export function calculateDayHours(events: ClockEvent[]): DayHours {
  let paidHours = 0;
  let paidBreakMinutes = 0;
  let unpaidBreakMinutes = 0;

  let clockIn: Date | null = null;
  let lunchStart: Date | null = null;
  let restStart: Date | null = null;

  const sorted = [...events].sort(
    (a, b) => parseISO(a.event_time).getTime() - parseISO(b.event_time).getTime()
  );

  for (const ev of sorted) {
    const t = parseISO(ev.event_time);
    switch (ev.event_type) {
      case 'clock_in':
        clockIn = t;
        break;
      case 'rest_break_start':
        restStart = t;
        break;
      case 'rest_break_end':
        if (restStart) {
          paidBreakMinutes += differenceInMinutes(t, restStart);
          restStart = null;
        }
        break;
      case 'lunch_break_start':
        lunchStart = t;
        break;
      case 'lunch_break_end':
        if (lunchStart) {
          unpaidBreakMinutes += differenceInMinutes(t, lunchStart);
          lunchStart = null;
        }
        break;
      case 'clock_out':
        if (clockIn) {
          let minutes = differenceInMinutes(t, clockIn);
          if (lunchStart) {
            unpaidBreakMinutes += differenceInMinutes(t, lunchStart);
            lunchStart = null;
          }
          minutes -= unpaidBreakMinutes;
          paidHours += Math.max(0, minutes) / 60;
          clockIn = null;
        }
        break;
    }
  }

  if (clockIn) {
    const now = new Date();
    let minutes = differenceInMinutes(now, clockIn);
    minutes -= unpaidBreakMinutes;
    paidHours += Math.max(0, minutes) / 60;
  }

  return {
    paidHours: Math.round(paidHours * 100) / 100,
    paidBreakMinutes,
    unpaidBreakMinutes,
  };
}

export function splitOrdinaryOvertime(totalHours: number): {
  ordinary: number;
  overtime: number;
} {
  const ordinary = Math.min(totalHours, OVERTIME_THRESHOLD_HOURS);
  const overtime = Math.max(0, totalHours - OVERTIME_THRESHOLD_HOURS);
  return {
    ordinary: Math.round(ordinary * 100) / 100,
    overtime: Math.round(overtime * 100) / 100,
  };
}

export interface TimesheetTotals {
  ordinaryHours: number;
  overtimeHours: number;
  paidBreakMinutes: number;
  unpaidBreakMinutes: number;
  grossPay: number;
}

export function computeTimesheetTotals(
  events: ClockEvent[],
  weekStartDate: string,
  user: {
    wage_rate: number | null;
    date_of_birth: string | null;
    contract_type: string | null;
    kiwisaver_rate?: number;
  }
): TimesheetTotals {
  const weekStart = parseISO(weekStartDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const weekEvents = events.filter((e) => {
    const t = parseISO(e.event_time);
    return t >= weekStart && t < weekEnd;
  });

  const byDay = new Map<string, ClockEvent[]>();
  for (const ev of weekEvents) {
    const day = format(parseISO(ev.event_time), 'yyyy-MM-dd');
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(ev);
  }

  let totalPaid = 0;
  let paidBreakMinutes = 0;
  let unpaidBreakMinutes = 0;

  for (const dayEvents of Array.from(byDay.values())) {
    const day = calculateDayHours(dayEvents);
    totalPaid += day.paidHours;
    paidBreakMinutes += day.paidBreakMinutes;
    unpaidBreakMinutes += day.unpaidBreakMinutes;
  }

  const { ordinary, overtime } = splitOrdinaryOvertime(totalPaid);
  const pay = calculatePay({
    wageRate: user.wage_rate,
    dateOfBirth: user.date_of_birth,
    contractType: user.contract_type,
    ordinaryHours: ordinary,
    overtimeHours: overtime,
    publicHolidayHours: 0,
    kiwisaverRate: user.kiwisaver_rate,
  });

  return {
    ordinaryHours: ordinary,
    overtimeHours: overtime,
    paidBreakMinutes,
    unpaidBreakMinutes,
    grossPay: Math.round(pay.grossPay * 100) / 100,
  };
}
