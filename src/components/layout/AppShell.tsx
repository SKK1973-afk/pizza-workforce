'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User, UserRole } from '@/types';
import { ROLE_LABELS } from '@/lib/permissions';
import {
  LayoutDashboard,
  Calendar,
  Clock,
  FileText,
  Palmtree,
  Coffee,
  DollarSign,
  Calculator,
  Download,
  BarChart3,
  Users,
  Settings,
  LogOut,
  Shield,
  MapPin,
  Bell,
  ClipboardList,
} from 'lucide-react';

const NAV_ITEMS: { href: string; label: string; icon: React.ElementType; roles: UserRole[] }[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['head_of_operations', 'area_manager', 'store_manager', 'hr_head', 'accounts_head'] },
  { href: '/clock', label: 'Clock In/Out', icon: Clock, roles: ['team_member', 'two_ic'] },
  { href: '/shifts', label: 'My Shifts', icon: Calendar, roles: ['team_member', 'two_ic'] },
  { href: '/roster', label: 'Roster', icon: Calendar, roles: ['head_of_operations', 'area_manager', 'store_manager', 'two_ic'] },
  { href: '/timesheets', label: 'Timesheets', icon: FileText, roles: ['head_of_operations', 'area_manager', 'store_manager', 'two_ic', 'hr_head'] },
  { href: '/leave', label: 'Leave Inbox', icon: Palmtree, roles: ['head_of_operations', 'area_manager', 'store_manager', 'two_ic'] },
  { href: '/leave/apply', label: 'Apply for Leave', icon: Palmtree, roles: ['team_member', 'two_ic'] },
  { href: '/leave/balances', label: 'Leave Balances', icon: Palmtree, roles: ['head_of_operations', 'hr_head', 'area_manager', 'store_manager', 'team_member', 'two_ic'] },
  { href: '/breaks', label: 'Break Compliance', icon: Coffee, roles: ['head_of_operations', 'area_manager', 'store_manager', 'two_ic'] },
  { href: '/labour-cost', label: 'Labour Cost', icon: DollarSign, roles: ['head_of_operations', 'area_manager', 'store_manager'] },
  { href: '/wage-advisor', label: 'Wage Advisor', icon: Calculator, roles: ['head_of_operations', 'hr_head', 'store_manager'] },
  { href: '/payroll', label: 'Payroll Export', icon: Download, roles: ['accounts_head', 'head_of_operations'] },
  { href: '/reports', label: 'Reports', icon: BarChart3, roles: ['head_of_operations', 'hr_head', 'accounts_head', 'area_manager', 'store_manager'] },
  { href: '/staff', label: 'Staff Directory', icon: Users, roles: ['head_of_operations', 'hr_head', 'area_manager', 'store_manager'] },
  { href: '/admin/users', label: 'User Management', icon: Shield, roles: ['system_admin'] },
  { href: '/admin/stores', label: 'Stores & Geofence', icon: MapPin, roles: ['system_admin'] },
  { href: '/admin/audit', label: 'Audit Log', icon: ClipboardList, roles: ['system_admin'] },
  { href: '/admin/notifications', label: 'Notifications', icon: Bell, roles: ['system_admin'] },
  { href: '/settings', label: 'Settings', icon: Settings, roles: ['head_of_operations', 'system_admin', 'hr_head', 'accounts_head', 'area_manager', 'store_manager', 'two_ic', 'team_member'] },
];

export function AppShell({ user, children }: { user: User; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const navItems = NAV_ITEMS.filter((item) => item.roles.includes(user.role));

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-slate-900 text-white flex-shrink-0">
        <div className="p-4 border-b border-slate-700">
          <h1 className="text-lg font-bold">Pizza Workforce</h1>
          <p className="text-xs text-slate-400 mt-1">{ROLE_LABELS[user.role]}</p>
          <p className="text-sm text-slate-300 mt-1 truncate">{user.full_name}</p>
        </div>
        <nav className="p-2 space-y-1 max-h-[70vh] overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                  active ? 'bg-info text-white' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-700">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition w-full"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8 overflow-auto">{children}</main>
    </div>
  );
}
