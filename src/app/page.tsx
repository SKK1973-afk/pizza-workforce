import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getDashboardPath } from '@/lib/permissions';

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  redirect(getDashboardPath(user.role));
}
