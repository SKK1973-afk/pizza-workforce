import { requireRouteAccess } from '@/lib/auth';
import { NotificationSettings } from '@/components/admin/NotificationSettings';

export default async function AdminNotificationsPage() {
  await requireRouteAccess('/admin/notifications');

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Notification Settings</h1>
      <p className="text-slate-600 mb-6">Configure system-wide notification defaults</p>
      <NotificationSettings />
    </div>
  );
}
