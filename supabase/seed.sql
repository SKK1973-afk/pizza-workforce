-- ================================================================
-- SEED DATA — Run AFTER creating auth users (see SETUP.md)
-- Replace the UUIDs below with your actual auth.users IDs
-- ================================================================

-- This seed uses fixed UUIDs for demo. When setting up:
-- 1. Create users in Supabase Auth dashboard
-- 2. Copy their UUIDs and update this file
-- 3. Run in SQL Editor

-- Example: Create auth users first via Supabase Dashboard → Authentication → Users
-- Email pattern for testing:
--   hoo@pizza.nz, admin@pizza.nz, hr@pizza.nz, accounts@pizza.nz
--   am@pizza.nz, sm-ponsonby@pizza.nz, 2ic-ponsonby@pizza.nz, staff1@pizza.nz

-- Store IDs (from schema.sql)
-- Ponsonby:  a0000001-0000-4000-8000-000000000001
-- Newmarket: a0000001-0000-4000-8000-000000000002
-- Takapuna:  a0000001-0000-4000-8000-000000000003

-- After auth users exist, upsert profiles:
/*
INSERT INTO users (id, full_name, email, role, store_id, area_store_ids, wage_rate, contract_type, ird_number, date_of_birth, start_date) VALUES
  ('USER_UUID_HOO', 'Sarah Mitchell', 'hoo@pizza.nz', 'head_of_operations', NULL, NULL, NULL, NULL, NULL, '1980-03-15', '2015-01-01'),
  ('USER_UUID_ADMIN', 'James Chen', 'admin@pizza.nz', 'system_admin', NULL, NULL, NULL, NULL, NULL, '1985-07-22', '2018-06-01'),
  ('USER_UUID_HR', 'Emma Wilson', 'hr@pizza.nz', 'hr_head', NULL, NULL, NULL, NULL, NULL, '1982-11-08', '2016-03-01'),
  ('USER_UUID_ACCOUNTS', 'David Park', 'accounts@pizza.nz', 'accounts_head', NULL, NULL, NULL, NULL, NULL, '1979-05-30', '2017-09-01'),
  ('USER_UUID_AM', 'Lisa Thompson', 'am@pizza.nz', 'area_manager', NULL,
    ARRAY['a0000001-0000-4000-8000-000000000001','a0000001-0000-4000-8000-000000000002','a0000001-0000-4000-8000-000000000003']::uuid[],
    NULL, NULL, NULL, '1988-01-12', '2019-02-01'),
  ('USER_UUID_SM1', 'Mike O''Brien', 'sm-ponsonby@pizza.nz', 'store_manager', 'a0000001-0000-4000-8000-000000000001', NULL, 28.50, 'permanent_fulltime', '123-456-789', '1990-04-20', '2020-01-15'),
  ('USER_UUID_SM2', 'Anna Lee', 'sm-newmarket@pizza.nz', 'store_manager', 'a0000001-0000-4000-8000-000000000002', NULL, 28.50, 'permanent_fulltime', '234-567-890', '1991-08-03', '2020-03-01'),
  ('USER_UUID_SM3', 'Tom Harris', 'sm-takapuna@pizza.nz', 'store_manager', 'a0000001-0000-4000-8000-000000000003', NULL, 28.50, 'permanent_fulltime', '345-678-901', '1989-12-17', '2021-06-01')
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, store_id = EXCLUDED.store_id;
*/

-- Sample shifts for current week (run after users exist)
-- Uses date_trunc to get Monday of current week

DO $$
DECLARE
  week_start DATE := date_trunc('week', CURRENT_DATE)::date;
  store_rec RECORD;
  staff_rec RECORD;
BEGIN
  FOR store_rec IN SELECT id, name FROM stores LOOP
    FOR staff_rec IN
      SELECT id FROM users WHERE store_id = store_rec.id AND role = 'team_member' LIMIT 3
    LOOP
      INSERT INTO shifts (store_id, user_id, shift_date, scheduled_start, scheduled_end, shift_type, week_start_date)
      VALUES (
        store_rec.id,
        staff_rec.id,
        week_start + 1,
        '09:00+12',
        '17:00+12',
        'morning',
        week_start
      ) ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- Sample leave requests (pending, approved, declined) — requires user IDs
-- Sample leave balances for current year
-- See scripts/seed-users.mjs for automated seeding
