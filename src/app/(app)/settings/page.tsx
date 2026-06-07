import { requireRouteAccess } from '@/lib/auth';
import { PersonalSettings } from '@/components/settings/PersonalSettings';
import { ROLE_LABELS } from '@/lib/permissions';

export default async function SettingsPage() {
  const user = await requireRouteAccess('/settings');

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-2">Settings</h1>
      <p className="text-slate-600 mb-6">Manage your account and notification preferences</p>

      <div className="card mb-6">
        <h2 className="font-semibold mb-3">Account</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Name</dt>
            <dd className="font-medium">{user.full_name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Role</dt>
            <dd>{ROLE_LABELS[user.role]}</dd>
          </div>
          {user.phone && (
            <div className="flex justify-between">
              <dt className="text-slate-500">Phone</dt>
              <dd>{user.phone}</dd>
            </div>
          )}
        </dl>
      </div>

      <PersonalSettings userId={user.id} kiwisaverRate={user.kiwisaver_rate} />
    </div>
  );
}
