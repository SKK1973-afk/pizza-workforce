'use client';

import { useState } from 'react';
import Papa from 'papaparse';
import { format, parseISO } from 'date-fns';
import type { Timesheet, User } from '@/types';
import { Download } from 'lucide-react';

interface PayrollExportProps {
  timesheets: (Timesheet & { user?: Pick<User, 'full_name' | 'email' | 'ird_number'> })[];
  weekStartDate: string;
}

export function PayrollExport({ timesheets, weekStartDate }: PayrollExportProps) {
  const [exporting, setExporting] = useState(false);

  function handleExport() {
    setExporting(true);

    const rows = timesheets.map((ts) => ({
      'Employee Name': ts.user?.full_name ?? '',
      Email: ts.user?.email ?? '',
      'IRD Number': ts.user?.ird_number ?? '',
      'Week Starting': ts.week_start_date,
      'Ordinary Hours': ts.ordinary_hours,
      'Overtime Hours': ts.overtime_hours,
      'Public Holiday Hours': ts.public_holiday_hours,
      'Paid Break (min)': ts.paid_break_minutes,
      'Unpaid Break (min)': ts.unpaid_break_minutes,
      'Gross Pay (NZD)': ts.gross_pay?.toFixed(2) ?? '0.00',
      Status: ts.status,
    }));

    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payroll-${weekStartDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setExporting(false);
  }

  const totalGross = timesheets.reduce((sum, ts) => sum + (ts.gross_pay ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">
              Week of {format(parseISO(weekStartDate), 'd MMM yyyy')}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {timesheets.length} timesheet{timesheets.length !== 1 ? 's' : ''} · Total gross: ${totalGross.toFixed(2)}
            </p>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting || timesheets.length === 0}
            className="btn-primary flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <Download size={18} />
            Export CSV
          </button>
        </div>
      </div>

      {timesheets.length > 0 && (
        <div className="overflow-x-auto card p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left p-3 font-medium">Employee</th>
                <th className="text-right p-3 font-medium">Ordinary</th>
                <th className="text-right p-3 font-medium">Overtime</th>
                <th className="text-right p-3 font-medium">Gross Pay</th>
                <th className="text-left p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {timesheets.map((ts) => (
                <tr key={ts.id} className="border-b border-slate-100">
                  <td className="p-3">{ts.user?.full_name ?? 'Unknown'}</td>
                  <td className="p-3 text-right">{ts.ordinary_hours}h</td>
                  <td className="p-3 text-right">{ts.overtime_hours}h</td>
                  <td className="p-3 text-right font-medium">${(ts.gross_pay ?? 0).toFixed(2)}</td>
                  <td className="p-3 capitalize">{ts.status.replace(/_/g, ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
