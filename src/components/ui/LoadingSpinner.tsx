export function LoadingSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <div className="w-8 h-8 border-4 border-info border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-500 text-sm">{message}</p>
    </div>
  );
}
