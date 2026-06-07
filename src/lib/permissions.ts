import type { User, UserRole } from '@/types';

const BUSINESS_DATA_ROLES: UserRole[] = [
  'head_of_operations',
  'hr_head',
  'accounts_head',
  'area_manager',
  'store_manager',
  'two_ic',
  'team_member',
];

export const ROLE_LABELS: Record<UserRole, string> = {
  head_of_operations: 'Head of Operations',
  system_admin: 'System Admin',
  hr_head: 'HR Head',
  accounts_head: 'Accounts Head',
  area_manager: 'Area Manager',
  store_manager: 'Store Manager',
  two_ic: '2IC (Assistant Manager)',
  team_member: 'Team Member',
};

export function canAccessBusinessData(role: UserRole): boolean {
  return BUSINESS_DATA_ROLES.includes(role);
}

export function canAccessStore(user: User, storeId: string): boolean {
  if (user.role === 'head_of_operations' || user.role === 'hr_head' || user.role === 'accounts_head') {
    return true;
  }
  if (user.role === 'system_admin') return false;
  if (user.role === 'area_manager') {
    return user.area_store_ids?.includes(storeId) ?? false;
  }
  return user.store_id === storeId;
}

export function canEditRoster(user: User, storeId: string): boolean {
  return user.role === 'store_manager' && user.store_id === storeId;
}

export function canViewRoster(user: User, storeId: string): boolean {
  if (['head_of_operations', 'area_manager'].includes(user.role)) {
    return canAccessStore(user, storeId);
  }
  if (['store_manager', 'two_ic'].includes(user.role)) {
    return user.store_id === storeId;
  }
  return false;
}

export function canApproveTimesheets(user: User, storeId: string): boolean {
  return user.role === 'store_manager' && user.store_id === storeId;
}

export function canExportPayroll(role: UserRole): boolean {
  return role === 'accounts_head' || role === 'head_of_operations';
}

export function canManageUsers(role: UserRole): boolean {
  return role === 'system_admin';
}

export function canManageStores(role: UserRole): boolean {
  return role === 'system_admin';
}

export function canViewAuditLog(role: UserRole): boolean {
  return role === 'system_admin';
}

export function canManageContracts(role: UserRole): boolean {
  return role === 'hr_head' || role === 'head_of_operations';
}

export function canViewWageRates(role: UserRole): boolean {
  return ['head_of_operations', 'hr_head', 'accounts_head', 'store_manager'].includes(role);
}

export function canClockIn(role: UserRole): boolean {
  return ['team_member', 'two_ic'].includes(role);
}

export function getDashboardPath(role: UserRole): string {
  switch (role) {
    case 'team_member':
      return '/clock';
    case 'two_ic':
      return '/shifts';
    case 'system_admin':
      return '/admin/users';
    case 'accounts_head':
      return '/payroll';
    case 'hr_head':
      return '/staff';
    default:
      return '/dashboard';
  }
}

export const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  '/dashboard': ['head_of_operations', 'area_manager', 'store_manager', 'two_ic', 'hr_head', 'accounts_head'],
  '/roster': ['head_of_operations', 'area_manager', 'store_manager', 'two_ic'],
  '/clock': ['team_member', 'two_ic'],
  '/shifts': ['team_member', 'two_ic'],
  '/timesheets': ['head_of_operations', 'area_manager', 'store_manager', 'two_ic', 'hr_head'],
  '/leave': ['head_of_operations', 'area_manager', 'store_manager', 'two_ic'],
  '/leave/apply': ['team_member', 'two_ic'],
  '/leave/balances': ['head_of_operations', 'hr_head', 'area_manager', 'store_manager', 'team_member', 'two_ic'],
  '/breaks': ['head_of_operations', 'area_manager', 'store_manager', 'two_ic'],
  '/labour-cost': ['head_of_operations', 'area_manager', 'store_manager'],
  '/wage-advisor': ['head_of_operations', 'hr_head', 'store_manager'],
  '/payroll': ['accounts_head', 'head_of_operations'],
  '/reports': ['head_of_operations', 'hr_head', 'accounts_head', 'area_manager', 'store_manager'],
  '/staff': ['head_of_operations', 'hr_head', 'area_manager', 'store_manager'],
  '/admin/users': ['system_admin'],
  '/admin/stores': ['system_admin'],
  '/admin/audit': ['system_admin'],
  '/admin/notifications': ['system_admin'],
  '/settings': BUSINESS_DATA_ROLES.concat(['system_admin']),
};

export function canAccessRoute(role: UserRole, path: string): boolean {
  const basePath = Object.keys(ROUTE_PERMISSIONS).find((route) => path.startsWith(route));
  if (!basePath) return true;
  return ROUTE_PERMISSIONS[basePath].includes(role);
}
