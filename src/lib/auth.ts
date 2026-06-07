import { createClient } from '@/lib/supabase/server';
import type { User } from '@/types';
import { redirect } from 'next/navigation';
import type { UserRole } from '@/types';
import { canAccessRoute, getDashboardPath } from '@/lib/permissions';

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const { data } = await supabase.from('users').select('*').eq('id', authUser.id).single();
  return data as User | null;
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!user.is_active) redirect('/login?error=deactivated');
  return user;
}

export async function requireRole(allowedRoles: UserRole[]): Promise<User> {
  const user = await requireUser();
  if (!allowedRoles.includes(user.role)) redirect(getDashboardPath(user.role));
  return user;
}

export async function requireRouteAccess(path: string): Promise<User> {
  const user = await requireUser();
  if (!canAccessRoute(user.role, path)) redirect(getDashboardPath(user.role));
  return user;
}
