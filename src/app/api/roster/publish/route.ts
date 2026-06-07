import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getApiUser } from '@/lib/api-auth';
import { canEditRoster } from '@/lib/permissions';

export async function POST(request: Request) {
  const auth = await getApiUser();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const { store_id, week_start_date } = await request.json();
  if (!store_id || !week_start_date) {
    return NextResponse.json({ error: 'store_id and week_start_date required' }, { status: 400 });
  }
  if (!canEditRoster(user, store_id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = await createServiceClient();
  const { data, error } = await supabase
    .from('shifts')
    .update({ published: true, updated_at: new Date().toISOString() })
    .eq('store_id', store_id)
    .eq('week_start_date', week_start_date)
    .select('id');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ published: data?.length ?? 0 });
}
