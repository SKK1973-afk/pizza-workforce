import { requireRouteAccess } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { EmptyState } from '@/components/ui/EmptyState';
import { format, parseISO } from 'date-fns';

export default async function AdminAuditPage() {
  await requireRouteAccess('/admin/audit');
  const supabase = await createClient();

  const { data: entries } = await supabase
    .from('audit_log')
    .select('*, user:users(full_name)')
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Audit Log</h1>
      <p className="text-slate-600 mb-6">System activity and data change history</p>

      {!entries?.length ? (
        <EmptyState title="No audit entries" description="Audit log entries will appear here as users make changes." />
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div key={entry.id} className="card py-3">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div>
                  <p className="font-medium capitalize">{entry.action.replace(/_/g, ' ')}</p>
                  <p className="text-sm text-slate-500">
                    {entry.user?.full_name ?? 'System'} · {entry.table_name ?? '—'}
                    {entry.record_id && ` · ${entry.record_id.slice(0, 8)}…`}
                  </p>
                </div>
                <p className="text-sm text-slate-400 whitespace-nowrap">
                  {format(parseISO(entry.created_at), 'd MMM yyyy, h:mm a')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
