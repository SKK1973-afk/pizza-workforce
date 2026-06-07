import { differenceInMinutes, parseISO } from 'date-fns';

export const NZ_TIMEZONE = 'Pacific/Auckland';

export const MINIMUM_WAGE_ADULT = 23.15;
export const MINIMUM_WAGE_STARTING = 18.52;
export const LABOUR_COST_TARGET_PCT = 30;
export const OVERTIME_THRESHOLD_HOURS = 40;
export const MAX_WEEKLY_HOURS = 50;
export const MIN_REST_BETWEEN_SHIFTS_HOURS = 11;
export const CASUAL_HOLIDAY_PAY_PCT = 0.08;
export const KIWISAVER_EMPLOYEE_MIN = 0.03;
export const KIWISAVER_EMPLOYER_MIN = 0.03;

export function getMinimumWage(dateOfBirth: string | null, asOf = new Date()): number {
  if (!dateOfBirth) return MINIMUM_WAGE_ADULT;
  const dob = new Date(dateOfBirth);
  const age =
    asOf.getFullYear() -
    dob.getFullYear() -
    (asOf < new Date(asOf.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
  return age >= 18 ? MINIMUM_WAGE_ADULT : MINIMUM_WAGE_STARTING;
}

export function getEffectiveWageRate(
  wageRate: number | null,
  dateOfBirth: string | null
): { rate: number; belowMinimum: boolean } {
  const minimum = getMinimumWage(dateOfBirth);
  const rate = wageRate ?? minimum;
  const effective = Math.max(rate, minimum);
  return { rate: effective, belowMinimum: rate < minimum };
}

export interface BreakSchedule {
  break_type: 'rest' | 'lunch';
  is_paid: boolean;
  duration_minutes: number;
  scheduled_time: Date;
}

export function calculateBreakSchedule(
  shiftStart: Date,
  shiftEnd: Date
): BreakSchedule[] {
  const durationMinutes = differenceInMinutes(shiftEnd, shiftStart);
  const breaks: BreakSchedule[] = [];

  if (durationMinutes < 120) return breaks;

  const midpoint = new Date(shiftStart.getTime() + (shiftEnd.getTime() - shiftStart.getTime()) / 2);
  const quarter = (shiftEnd.getTime() - shiftStart.getTime()) / 4;

  if (durationMinutes >= 120 && durationMinutes < 240) {
    breaks.push({
      break_type: 'rest',
      is_paid: true,
      duration_minutes: 10,
      scheduled_time: new Date(shiftStart.getTime() + quarter),
    });
  } else if (durationMinutes >= 240 && durationMinutes < 360) {
    breaks.push({
      break_type: 'rest',
      is_paid: true,
      duration_minutes: 10,
      scheduled_time: new Date(shiftStart.getTime() + quarter),
    });
    breaks.push({
      break_type: 'lunch',
      is_paid: false,
      duration_minutes: 30,
      scheduled_time: midpoint,
    });
  } else if (durationMinutes >= 360) {
    breaks.push({
      break_type: 'rest',
      is_paid: true,
      duration_minutes: 10,
      scheduled_time: new Date(shiftStart.getTime() + quarter),
    });
    breaks.push({
      break_type: 'lunch',
      is_paid: false,
      duration_minutes: 30,
      scheduled_time: midpoint,
    });
    breaks.push({
      break_type: 'rest',
      is_paid: true,
      duration_minutes: 10,
      scheduled_time: new Date(midpoint.getTime() + quarter),
    });
  }

  return breaks;
}

export interface PayBreakdown {
  baseRate: number;
  ordinaryHours: number;
  overtimeHours: number;
  publicHolidayHours: number;
  basePay: number;
  overtimePay: number;
  publicHolidayPay: number;
  casualHolidayPay: number;
  grossPay: number;
  kiwisaverEmployee: number;
  kiwisaverEmployer: number;
  payeEstimate: number;
  netPay: number;
  belowMinimum: boolean;
}

export function calculatePay(params: {
  wageRate: number | null;
  dateOfBirth: string | null;
  contractType: string | null;
  ordinaryHours: number;
  overtimeHours: number;
  publicHolidayHours: number;
  isPublicHoliday?: boolean;
  kiwisaverRate?: number;
}): PayBreakdown {
  const { rate, belowMinimum } = getEffectiveWageRate(params.wageRate, params.dateOfBirth);
  const ksRate = params.kiwisaverRate ?? 3;

  const basePay = params.ordinaryHours * rate;
  const overtimePay = params.overtimeHours * rate * 1.5;
  const publicHolidayPay = params.publicHolidayHours * rate * 1.5;
  const casualHolidayPay =
    params.contractType === 'casual'
      ? (basePay + overtimePay + publicHolidayPay) * CASUAL_HOLIDAY_PAY_PCT
      : 0;

  const grossPay = basePay + overtimePay + publicHolidayPay + casualHolidayPay;
  const kiwisaverEmployee = grossPay * (ksRate / 100);
  const kiwisaverEmployer = grossPay * KIWISAVER_EMPLOYER_MIN;
  const payeEstimate = grossPay * 0.175;
  const netPay = grossPay - kiwisaverEmployee - payeEstimate;

  return {
    baseRate: rate,
    ordinaryHours: params.ordinaryHours,
    overtimeHours: params.overtimeHours,
    publicHolidayHours: params.publicHolidayHours,
    basePay,
    overtimePay,
    publicHolidayPay,
    casualHolidayPay,
    grossPay,
    kiwisaverEmployee,
    kiwisaverEmployer,
    payeEstimate,
    netPay,
    belowMinimum,
  };
}

export function calculateLabourCostPct(totalWages: number, revenue: number): number {
  if (revenue <= 0) return 0;
  return (totalWages / revenue) * 100;
}

export function hoursBetweenShifts(endTime: Date, startTime: Date): number {
  return (startTime.getTime() - endTime.getTime()) / (1000 * 60 * 60);
}
