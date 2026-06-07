import { requireRouteAccess } from '@/lib/auth';
import Link from 'next/link';
import {
  FileText,
  Coffee,
  DollarSign,
  Palmtree,
  Users,
  BarChart3,
  Calendar,
} from 'lucide-react';

const REPORT_LINKS = [
  { href: '/timesheets', label: 'Timesheets', description: 'Weekly hours and pay summaries', icon: FileText },
  { href: '/breaks', label: 'Break Compliance', description: 'Rest and lunch break adherence', icon: Coffee },
  { href: '/labour-cost', label: 'Labour Cost', description: 'Wage spend vs revenue analysis', icon: DollarSign },
  { href: '/leave/balances', label: 'Leave Balances', description: 'Annual and sick leave entitlements', icon: Palmtree },
  { href: '/staff', label: 'Staff Directory', description: 'Employee profiles and contracts', icon: Users },
  { href: '/roster', label: 'Rosters', description: 'Weekly shift schedules by store', icon: Calendar },
  { href: '/payroll', label: 'Payroll Export', description: 'CSV export for accounts', icon: BarChart3 },
];

export default async function ReportsPage() {
  const user = await requireRouteAccess('/reports');

  const links = REPORT_LINKS.filter((link) => {
    if (link.href === '/payroll' && !['accounts_head', 'head_of_operations'].includes(user.role)) return false;
    return true;
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Reports</h1>
      <p className="text-slate-600 mb-8">Access workforce reports and analytics</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link key={link.href} href={link.href} className="card hover:border-info transition group">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-50 text-info group-hover:bg-info group-hover:text-white transition">
                  <Icon size={20} />
                </div>
                <div>
                  <h2 className="font-semibold">{link.label}</h2>
                  <p className="text-sm text-slate-500 mt-1">{link.description}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
