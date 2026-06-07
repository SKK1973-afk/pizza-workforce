'use client';

import { useState, useMemo } from 'react';
import { calculateLabourCostPct, LABOUR_COST_TARGET_PCT } from '@/lib/nz-employment';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { format, parseISO } from 'date-fns';

interface LabourCostDashboardProps {
  initialTotalWages: number;
  weekStart: string;
  stores: { id: string; name: string }[];
  userStoreId: string | null;
}

export function LabourCostDashboard({ initialTotalWages, weekStart, stores, userStoreId }: LabourCostDashboardProps) {
  const [revenue, setRevenue] = useState('');
  const [selectedStore, setSelectedStore] = useState(userStoreId ?? stores[0]?.id ?? '');

  const revenueNum = parseFloat(revenue) || 0;
  const labourPct = useMemo(() => calculateLabourCostPct(initialTotalWages, revenueNum), [initialTotalWages, revenueNum]);

  const onTarget = labourPct > 0 && labourPct <= LABOUR_COST_TARGET_PCT;
  const overTarget = labourPct > LABOUR_COST_TARGET_PCT;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-sm text-slate-500">Week Starting</p>
          <p className="text-xl font-bold mt-1">{format(parseISO(weekStart), 'd MMM yyyy')}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Total Wages</p>
          <p className="text-xl font-bold mt-1">${initialTotalWages.toFixed(2)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-slate-500">Labour Cost %</p>
          <p className={`text-xl font-bold mt-1 ${overTarget ? 'text-breach' : onTarget ? 'text-compliant' : ''}`}>
            {revenueNum > 0 ? `${labourPct.toFixed(1)}%` : '—'}
          </p>
          {revenueNum > 0 && (
            <StatusBadge status={onTarget ? 'success' : overTarget ? 'danger' : 'neutral'}>
              Target: {LABOUR_COST_TARGET_PCT}%
            </StatusBadge>
          )}
        </div>
      </div>

      <div className="card space-y-4">
        <h2 className="font-semibold">Revenue Input</h2>
        {stores.length > 1 && (
          <div>
            <label className="label">Store</label>
            <select className="input" value={selectedStore} onChange={(e) => setSelectedStore(e.target.value)}>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="label">Weekly Revenue (NZD)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            className="input"
            placeholder="Enter weekly revenue..."
            value={revenue}
            onChange={(e) => setRevenue(e.target.value)}
          />
        </div>
        {revenueNum > 0 && (
          <p className="text-sm text-slate-600">
            Labour cost is {labourPct.toFixed(1)}% of ${revenueNum.toLocaleString()} revenue.
            {overTarget && ' This exceeds the target — review scheduling or hours.'}
          </p>
        )}
      </div>
    </div>
  );
}
