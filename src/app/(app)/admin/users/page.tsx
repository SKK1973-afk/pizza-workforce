import { requireRouteAccess } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ROLE_LABELS } from '@/lib/permissions';
import type { UserRole } from '@/types';
import { getJoinedField } from '@/lib/supabase-helpers';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';

export default async function AdminUsersPage() {
  await requireRouteAccess('/admin/users');
  const supabase = await createClient();

  const { data: users } = await supabase
    .from('users')
    .select('id, full_name, email, role, store_id, is_active, created_at, store:stores(name)')
    .order('full_name');

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">User Management</h1>
      <p className="text-slate-600 mb-6">Manage system users and role assignments</p>

      {!users?.length ? (
        <EmptyState title="No users" description="No users found in the system." />
      ) : (
        <div className="overflow-x-auto card p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left p-3 font-medium">Name</th>
                <th className="text-left p-3 font-medium">Email</th>
                <th className="text-left p-3 font-medium">Role</th>
                <th className="text-left p-3 font-medium">Store</th>
                <th className="text-left p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-slate-100">
                  <td className="p-3 font-medium">{u.full_name}</td>
                  <td className="p-3 text-slate-600">{u.email}</td>
                  <td className="p-3">
                    <StatusBadge status="info">{ROLE_LABELS[u.role as UserRole] ?? u.role}</StatusBadge>
                  </td>
                  <td className="p-3 text-slate-600">{getJoinedField(u.store, 'name') ?? '—'}</td>
                  <td className="p-3">
                    <StatusBadge status={u.is_active ? 'success' : 'danger'}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
