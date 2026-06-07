import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { User } from '@/types';

export async function getApiUser(): Promise<{ user: User } | NextResponse> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single();

  if (!profile?.is_active) {
    return NextResponse.json({ error: 'Account deactivated' }, { status: 403 });
  }

  return { user: profile as User };
}
