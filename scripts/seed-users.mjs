/**
 * Seed script — creates auth users and profiles for demo.
 * Run: node scripts/seed-users.mjs
 * Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in .env.local
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  try {
    const envPath = resolve(__dirname, '../.env.local');
    const content = readFileSync(envPath, 'utf8');
    const env = {};
    for (const line of content.split('\n')) {
      const [key, ...vals] = line.split('=');
      if (key && vals.length) env[key.trim()] = vals.join('=').trim();
    }
    return env;
  } catch {
    console.error('Create .env.local first with Supabase keys');
    process.exit(1);
  }
}

const env = loadEnv();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const STORES = {
  ponsonby: 'a0000001-0000-4000-8000-000000000001',
  newmarket: 'a0000001-0000-4000-8000-000000000002',
  takapuna: 'a0000001-0000-4000-8000-000000000003',
};

const ALL_STORES = Object.values(STORES);
const PASSWORD = 'Demo1234!';

const USERS = [
  { email: 'hoo@pizza.nz', name: 'Sarah Mitchell', role: 'head_of_operations' },
  { email: 'admin@pizza.nz', name: 'James Chen', role: 'system_admin' },
  { email: 'hr@pizza.nz', name: 'Emma Wilson', role: 'hr_head' },
  { email: 'accounts@pizza.nz', name: 'David Park', role: 'accounts_head' },
  { email: 'am@pizza.nz', name: 'Lisa Thompson', role: 'area_manager', area_store_ids: ALL_STORES },
  { email: 'sm-ponsonby@pizza.nz', name: "Mike O'Brien", role: 'store_manager', store_id: STORES.ponsonby, wage_rate: 28.5 },
  { email: 'sm-newmarket@pizza.nz', name: 'Anna Lee', role: 'store_manager', store_id: STORES.newmarket, wage_rate: 28.5 },
  { email: 'sm-takapuna@pizza.nz', name: 'Tom Harris', role: 'store_manager', store_id: STORES.takapuna, wage_rate: 28.5 },
  { email: '2ic-ponsonby@pizza.nz', name: 'Jake Rivera', role: 'two_ic', store_id: STORES.ponsonby, wage_rate: 25.0 },
  { email: '2ic-newmarket@pizza.nz', name: 'Sophie Brown', role: 'two_ic', store_id: STORES.newmarket, wage_rate: 25.0 },
  { email: '2ic-takapuna@pizza.nz', name: 'Chris Ng', role: 'two_ic', store_id: STORES.takapuna, wage_rate: 25.0 },
  { email: 'staff1@pizza.nz', name: 'Alex Kumar', role: 'team_member', store_id: STORES.ponsonby, wage_rate: 23.15, contract_type: 'casual' },
  { email: 'staff2@pizza.nz', name: 'Mia Taylor', role: 'team_member', store_id: STORES.ponsonby, wage_rate: 23.15, contract_type: 'permanent_parttime' },
  { email: 'staff3@pizza.nz', name: 'Liam Foster', role: 'team_member', store_id: STORES.ponsonby, wage_rate: 23.15, contract_type: 'casual' },
  { email: 'staff4@pizza.nz', name: 'Zoe Martin', role: 'team_member', store_id: STORES.newmarket, wage_rate: 23.15, contract_type: 'casual' },
  { email: 'staff5@pizza.nz', name: 'Noah Wright', role: 'team_member', store_id: STORES.newmarket, wage_rate: 23.15, contract_type: 'permanent_parttime' },
  { email: 'staff6@pizza.nz', name: 'Isla Cooper', role: 'team_member', store_id: STORES.newmarket, wage_rate: 23.15, contract_type: 'casual' },
  { email: 'staff7@pizza.nz', name: 'Ethan Bell', role: 'team_member', store_id: STORES.takapuna, wage_rate: 23.15, contract_type: 'casual' },
  { email: 'staff8@pizza.nz', name: 'Ruby Scott', role: 'team_member', store_id: STORES.takapuna, wage_rate: 23.15, contract_type: 'permanent_parttime' },
  { email: 'staff9@pizza.nz', name: 'Oscar Green', role: 'team_member', store_id: STORES.takapuna, wage_rate: 23.15, contract_type: 'casual' },
];

async function main() {
  console.log('Seeding users...');
  const createdIds = [];

  for (const u of USERS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: u.name, role: u.role },
    });

    if (error) {
      if (error.message.includes('already been registered')) {
        const { data: existing } = await supabase.auth.admin.listUsers();
        const found = existing?.users?.find((x) => x.email === u.email);
        if (found) createdIds.push({ ...u, id: found.id });
        continue;
      }
      console.error(`Failed ${u.email}:`, error.message);
      continue;
    }

    const id = data.user.id;
    createdIds.push({ ...u, id });

    await supabase.from('users').upsert({
      id,
      full_name: u.name,
      email: u.email,
      role: u.role,
      store_id: u.store_id ?? null,
      area_store_ids: u.area_store_ids ?? null,
      wage_rate: u.wage_rate ?? null,
      contract_type: u.contract_type ?? null,
      ird_number: u.role === 'team_member' ? `${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 900) + 100}` : null,
      date_of_birth: u.role === 'team_member' ? '2000-06-15' : '1985-01-01',
      start_date: '2023-01-01',
      is_active: true,
    });
    console.log(`  ✓ ${u.email} (${u.role})`);
  }

  const year = new Date().getFullYear();
  for (const u of createdIds.filter((x) => x.role === 'team_member')) {
    await supabase.from('leave_balances').upsert([
      { user_id: u.id, leave_type: 'annual', balance_days: 15, accrued_days: 20, used_days: 5, year },
      { user_id: u.id, leave_type: 'sick', balance_days: 8, accrued_days: 10, used_days: 2, year },
    ], { onConflict: 'user_id,leave_type,year' });
  }

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const weekStr = weekStart.toISOString().split('T')[0];

  for (const u of createdIds.filter((x) => x.role === 'team_member' && x.store_id)) {
    await supabase.from('shifts').insert({
      store_id: u.store_id,
      user_id: u.id,
      shift_date: weekStr,
      scheduled_start: '09:00+12',
      scheduled_end: '17:00+12',
      shift_type: 'morning',
      week_start_date: weekStr,
    });
  }

  const staff = createdIds.filter((x) => x.role === 'team_member');
  if (staff[0]) {
    await supabase.from('leave_requests').insert([
      { user_id: staff[0].id, store_id: staff[0].store_id, leave_type: 'annual', start_date: '2026-07-01', end_date: '2026-07-05', days_requested: 5, status: 'pending', notes: 'Family holiday' },
      { user_id: staff[1]?.id, store_id: staff[1]?.store_id, leave_type: 'sick', start_date: '2026-06-10', end_date: '2026-06-10', days_requested: 1, status: 'pending', notes: 'Not feeling well' },
      { user_id: staff[2]?.id, store_id: staff[2]?.store_id, leave_type: 'annual', start_date: '2026-05-20', end_date: '2026-05-22', days_requested: 3, status: 'approved', notes: 'Long weekend' },
      { user_id: staff[3]?.id, store_id: staff[3]?.store_id, leave_type: 'unpaid', start_date: '2026-06-15', end_date: '2026-06-15', days_requested: 1, status: 'declined', decline_reason: 'Short staffed that day', notes: 'Personal errand' },
    ].filter((r) => r.user_id && r.store_id));
  }

  console.log('\nDone! All demo users password:', PASSWORD);
  console.log('Login as staff1@pizza.nz to test clock in/out');
  console.log('Login as sm-ponsonby@pizza.nz to test roster builder');
}

main().catch(console.error);
