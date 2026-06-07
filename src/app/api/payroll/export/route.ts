import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { calculatePay } from '@/lib/nz-employment';
import Papa from 'papaparse';

export async function POST(request: Request) {
  await requireRole(['accounts_head', 'head_of_operations']);
  const supabase = await createClient();
  const { periodStart, periodEnd, storeId } = await request.json();

  const { data: timesheets, error } = await supabase
    .from('timesheets')
    .select('*, users(*), stores(name)')
    .gte('week_start_date', periodStart)
    .lte('week_start_date', periodEnd)
    .eq('status', 'approved');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!timesheets?.length) return NextResponse.json({ error: 'No approved timesheets for this period' }, { status: 400 });

  const unapproved = timesheets.filter((t) => t.status !== 'approved');
  if (unapproved.length) {
    return NextResponse.json({ error: 'All timesheets must be approved before export' }, { status: 400 });
  }

  const filtered = storeId ? timesheets.filter((t) => t.store_id === storeId) : timesheets;

  const rows = filtered.map((ts) => {
    const user = ts.users as Record<string, unknown>;
    const store = ts.stores as { name: string };
    const pay = calculatePay({
      wageRate: user.wage_rate as number,
      dateOfBirth: user.date_of_birth as string,
      contractType: user.contract_type as string,
      ordinaryHours: ts.ordinary_hours,
      overtimeHours: ts.overtime_hours,
      publicHolidayHours: ts.public_holiday_hours,
      kiwisaverRate: user.kiwisaver_rate as number,
    });

    return {
      Employee_ID: user.id,
      Full_Name: user.full_name,
      IRD_Number: user.ird_number ?? '',
      Contract_Type: user.contract_type ?? '',
      Store_Name: store?.name ?? '',
      Week_Start: ts.week_start_date,
      Week_End: periodEnd,
      Ordinary_Hours: ts.ordinary_hours,
      Overtime_Hours: ts.overtime_hours,
      PublicHoliday_Hours: ts.public_holiday_hours,
      Paid_Breaks_Mins: ts.paid_break_minutes,
      Unpaid_Breaks_Mins: ts.unpaid_break_minutes,
      Leave_Type: '',
      Leave_Days: 0,
      Holiday_Pay_Pct: user.contract_type === 'casual' ? '8%' : '0%',
      Holiday_Pay_Amount: pay.casualHolidayPay.toFixed(2),
      Base_Rate: pay.baseRate.toFixed(2),
      Gross_Pay: pay.grossPay.toFixed(2),
      PAYE_Deduction: pay.payeEstimate.toFixed(2),
      KiwiSaver_Employee: pay.kiwisaverEmployee.toFixed(2),
      KiwiSaver_Employer: pay.kiwisaverEmployer.toFixed(2),
      Net_Pay: pay.netPay.toFixed(2),
      ClockIn_Method: 'geofence',
      Geofence_Exceptions: 0,
    };
  });

  const csv = Papa.unparse(rows);
  const filename = `payroll_${periodStart}_to_${periodEnd}.csv`;

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
