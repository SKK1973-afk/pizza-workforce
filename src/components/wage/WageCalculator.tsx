'use client';

import { useState, useMemo } from 'react';
import { calculatePay, MINIMUM_WAGE_ADULT, MINIMUM_WAGE_STARTING } from '@/lib/nz-employment';
import type { ContractType } from '@/types';

const CONTRACT_OPTIONS: { value: ContractType; label: string }[] = [
  { value: 'permanent_fulltime', label: 'Permanent Full-time' },
  { value: 'permanent_parttime', label: 'Permanent Part-time' },
  { value: 'casual', label: 'Casual' },
  { value: 'fixed_term', label: 'Fixed Term' },
];

export function WageCalculator() {
  const [wageRate, setWageRate] = useState('23.15');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [contractType, setContractType] = useState<ContractType>('permanent_parttime');
  const [ordinaryHours, setOrdinaryHours] = useState('40');
  const [overtimeHours, setOvertimeHours] = useState('0');
  const [publicHolidayHours, setPublicHolidayHours] = useState('0');
  const [kiwisaverRate, setKiwisaverRate] = useState('3');

  const breakdown = useMemo(
    () =>
      calculatePay({
        wageRate: parseFloat(wageRate) || null,
        dateOfBirth: dateOfBirth || null,
        contractType,
        ordinaryHours: parseFloat(ordinaryHours) || 0,
        overtimeHours: parseFloat(overtimeHours) || 0,
        publicHolidayHours: parseFloat(publicHolidayHours) || 0,
        kiwisaverRate: parseFloat(kiwisaverRate) || 3,
      }),
    [wageRate, dateOfBirth, contractType, ordinaryHours, overtimeHours, publicHolidayHours, kiwisaverRate]
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="card space-y-4">
        <h2 className="text-lg font-semibold">Inputs</h2>

        <div>
          <label className="label">Hourly Wage Rate (NZD)</label>
          <input
            type="number"
            step="0.01"
            className="input"
            value={wageRate}
            onChange={(e) => setWageRate(e.target.value)}
          />
          <p className="text-xs text-slate-500 mt-1">
            Minimum: ${MINIMUM_WAGE_ADULT} (adult) / ${MINIMUM_WAGE_STARTING} (starting-out)
          </p>
        </div>

        <div>
          <label className="label">Date of Birth</label>
          <input
            type="date"
            className="input"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
          />
        </div>

        <div>
          <label className="label">Contract Type</label>
          <select
            className="input"
            value={contractType}
            onChange={(e) => setContractType(e.target.value as ContractType)}
          >
            {CONTRACT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Ordinary Hours</label>
            <input
              type="number"
              step="0.5"
              className="input"
              value={ordinaryHours}
              onChange={(e) => setOrdinaryHours(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Overtime Hours</label>
            <input
              type="number"
              step="0.5"
              className="input"
              value={overtimeHours}
              onChange={(e) => setOvertimeHours(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Public Holiday Hours</label>
            <input
              type="number"
              step="0.5"
              className="input"
              value={publicHolidayHours}
              onChange={(e) => setPublicHolidayHours(e.target.value)}
            />
          </div>
          <div>
            <label className="label">KiwiSaver %</label>
            <input
              type="number"
              step="1"
              min="3"
              max="10"
              className="input"
              value={kiwisaverRate}
              onChange={(e) => setKiwisaverRate(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="card space-y-4">
        <h2 className="text-lg font-semibold">Pay Breakdown</h2>

        {breakdown.belowMinimum && (
          <p className="text-sm text-breach bg-red-50 p-3 rounded-lg">
            Rate adjusted to meet NZ minimum wage.
          </p>
        )}

        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Effective Rate</dt>
            <dd className="font-medium">${breakdown.baseRate.toFixed(2)}/hr</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Base Pay</dt>
            <dd>${breakdown.basePay.toFixed(2)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Overtime Pay (1.5×)</dt>
            <dd>${breakdown.overtimePay.toFixed(2)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Public Holiday Pay</dt>
            <dd>${breakdown.publicHolidayPay.toFixed(2)}</dd>
          </div>
          {breakdown.casualHolidayPay > 0 && (
            <div className="flex justify-between">
              <dt className="text-slate-500">Casual Holiday Pay (8%)</dt>
              <dd>${breakdown.casualHolidayPay.toFixed(2)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold text-base">
            <dt>Gross Pay</dt>
            <dd>${breakdown.grossPay.toFixed(2)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">KiwiSaver (employee)</dt>
            <dd>-${breakdown.kiwisaverEmployee.toFixed(2)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">PAYE (estimate)</dt>
            <dd>-${breakdown.payeEstimate.toFixed(2)}</dd>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-lg text-compliant">
            <dt>Net Pay (est.)</dt>
            <dd>${breakdown.netPay.toFixed(2)}</dd>
          </div>
        </dl>

        <p className="text-xs text-slate-400">
          Employer KiwiSaver contribution: ${breakdown.kiwisaverEmployer.toFixed(2)}. PAYE is an estimate only.
        </p>
      </div>
    </div>
  );
}
