import { requireRouteAccess } from '@/lib/auth';
import { WageCalculator } from '@/components/wage/WageCalculator';

export default async function WageAdvisorPage() {
  await requireRouteAccess('/wage-advisor');

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Wage Advisor</h1>
      <p className="text-slate-600 mb-6">Calculate NZ-compliant pay including KiwiSaver and casual loading</p>
      <WageCalculator />
    </div>
  );
}
