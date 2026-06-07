export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card text-center py-12">
      <h3 className="text-lg font-medium text-slate-700">{title}</h3>
      <p className="text-slate-500 mt-2 max-w-md mx-auto">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
