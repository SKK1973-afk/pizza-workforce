type Status = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const styles: Record<Status, string> = {
  success: 'badge-green',
  warning: 'badge-amber',
  danger: 'badge-red',
  info: 'badge-blue',
  neutral: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700',
};

export function StatusBadge({ status, children }: { status: Status; children: React.ReactNode }) {
  return <span className={styles[status]}>{children}</span>;
}
