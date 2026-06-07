-- ================================================================
-- PIZZA WORKFORCE MANAGEMENT — COMPLETE DATABASE SCHEMA
-- Run this entire file in Supabase SQL Editor
-- ================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- TABLES
-- ================================================================

CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  geofence_radius_meters INTEGER DEFAULT 200,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN (
    'head_of_operations','system_admin','hr_head',
    'accounts_head','area_manager','store_manager',
    'two_ic','team_member'
  )),
  store_id UUID REFERENCES stores(id),
  area_store_ids UUID[],
  ird_number TEXT,
  contract_type TEXT CHECK (contract_type IN (
    'permanent_fulltime','permanent_parttime',
    'casual','fixed_term'
  )),
  wage_rate DECIMAL(8,2),
  kiwisaver_rate DECIMAL(4,2) DEFAULT 3.00,
  is_active BOOLEAN DEFAULT true,
  date_of_birth DATE,
  start_date DATE,
  end_date DATE,
  notification_preferences JSONB DEFAULT '{"push_enabled":true,"email_enabled":true}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  user_id UUID NOT NULL REFERENCES users(id),
  shift_date DATE NOT NULL,
  scheduled_start TIMETZ NOT NULL,
  scheduled_end TIMETZ NOT NULL,
  shift_type TEXT CHECK (shift_type IN ('morning','evening','close','split')),
  week_start_date DATE NOT NULL,
  notes TEXT,
  published BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scheduled_breaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  break_type TEXT NOT NULL CHECK (break_type IN ('rest','lunch')),
  is_paid BOOLEAN NOT NULL,
  duration_minutes INTEGER NOT NULL,
  scheduled_time TIMETZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clock_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID REFERENCES shifts(id),
  user_id UUID NOT NULL REFERENCES users(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'clock_in','rest_break_start','rest_break_end',
    'lunch_break_start','lunch_break_end','clock_out'
  )),
  event_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  distance_from_store_meters INTEGER,
  verification_method TEXT CHECK (verification_method IN ('geofence','selfie','manual')),
  selfie_photo_url TEXT,
  manual_reason TEXT,
  is_approved BOOLEAN DEFAULT true,
  approved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS timesheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  week_start_date DATE NOT NULL,
  ordinary_hours DECIMAL(6,2) DEFAULT 0,
  overtime_hours DECIMAL(6,2) DEFAULT 0,
  public_holiday_hours DECIMAL(6,2) DEFAULT 0,
  paid_break_minutes INTEGER DEFAULT 0,
  unpaid_break_minutes INTEGER DEFAULT 0,
  gross_pay DECIMAL(10,2),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','pending_approval','approved','exported')),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, week_start_date)
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  leave_type TEXT NOT NULL CHECK (leave_type IN ('annual','sick','bereavement','unpaid','other')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_requested DECIMAL(4,1) NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','declined')),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  decline_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leave_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  leave_type TEXT NOT NULL,
  balance_days DECIMAL(5,1) DEFAULT 0,
  accrued_days DECIMAL(5,1) DEFAULT 0,
  used_days DECIMAL(5,1) DEFAULT 0,
  year INTEGER NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, leave_type, year)
);

CREATE TABLE IF NOT EXISTS payroll_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open','locked','exported')),
  exported_by UUID REFERENCES users(id),
  exported_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS store_revenue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  revenue_date DATE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id, revenue_date)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ================================================================
-- HELPER FUNCTIONS FOR RLS
-- ================================================================

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_user_store_id()
RETURNS UUID AS $$
  SELECT store_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_user_area_stores()
RETURNS UUID[] AS $$
  SELECT area_store_ids FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.can_access_store(target_store_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  r TEXT;
  sid UUID;
  area_ids UUID[];
BEGIN
  SELECT role, store_id, area_store_ids INTO r, sid, area_ids
  FROM public.users WHERE id = auth.uid();

  IF r IN ('head_of_operations','hr_head','accounts_head') THEN RETURN TRUE; END IF;
  IF r = 'system_admin' THEN RETURN FALSE; END IF;
  IF r = 'area_manager' THEN RETURN target_store_id = ANY(area_ids); END IF;
  RETURN sid = target_store_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'team_member')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-create scheduled breaks when shift is inserted
CREATE OR REPLACE FUNCTION public.create_scheduled_breaks()
RETURNS TRIGGER AS $$
DECLARE
  duration_mins INTEGER;
  shift_start TIMESTAMPTZ;
  shift_end TIMESTAMPTZ;
  midpoint TIMESTAMPTZ;
  quarter TIMESTAMPTZ;
BEGIN
  shift_start := (NEW.shift_date + NEW.scheduled_start::time)::timestamptz;
  shift_end := (NEW.shift_date + NEW.scheduled_end::time)::timestamptz;
  duration_mins := EXTRACT(EPOCH FROM (shift_end - shift_start)) / 60;

  IF duration_mins >= 120 AND duration_mins < 240 THEN
    quarter := shift_start + (shift_end - shift_start) / 4;
    INSERT INTO scheduled_breaks (shift_id, break_type, is_paid, duration_minutes, scheduled_time)
    VALUES (NEW.id, 'rest', true, 10, quarter);
  ELSIF duration_mins >= 240 AND duration_mins < 360 THEN
    quarter := shift_start + (shift_end - shift_start) / 4;
    midpoint := shift_start + (shift_end - shift_start) / 2;
    INSERT INTO scheduled_breaks (shift_id, break_type, is_paid, duration_minutes, scheduled_time) VALUES
      (NEW.id, 'rest', true, 10, quarter),
      (NEW.id, 'lunch', false, 30, midpoint);
  ELSIF duration_mins >= 360 THEN
    quarter := shift_start + (shift_end - shift_start) / 4;
    midpoint := shift_start + (shift_end - shift_start) / 2;
    INSERT INTO scheduled_breaks (shift_id, break_type, is_paid, duration_minutes, scheduled_time) VALUES
      (NEW.id, 'rest', true, 10, quarter),
      (NEW.id, 'lunch', false, 30, midpoint),
      (NEW.id, 'rest', true, 10, midpoint + (shift_end - shift_start) / 4);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_shift_created ON shifts;
CREATE TRIGGER on_shift_created
  AFTER INSERT ON shifts
  FOR EACH ROW EXECUTE FUNCTION public.create_scheduled_breaks();

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================

ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_breaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE clock_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- STORES
CREATE POLICY "stores_select" ON stores FOR SELECT TO authenticated
  USING (get_user_role() != 'system_admin' OR true);
CREATE POLICY "stores_admin_all" ON stores FOR ALL TO authenticated
  USING (get_user_role() = 'system_admin')
  WITH CHECK (get_user_role() = 'system_admin');
CREATE POLICY "stores_read_business" ON stores FOR SELECT TO authenticated
  USING (get_user_role() IN ('head_of_operations','hr_head','accounts_head','area_manager','store_manager','two_ic','team_member'));

-- USERS
CREATE POLICY "users_select_own" ON users FOR SELECT TO authenticated
  USING (id = auth.uid());
CREATE POLICY "users_select_managers" ON users FOR SELECT TO authenticated
  USING (
    get_user_role() IN ('head_of_operations','hr_head','area_manager','store_manager','system_admin')
    AND (get_user_role() = 'system_admin' OR can_access_store(store_id))
  );
CREATE POLICY "users_admin_manage" ON users FOR ALL TO authenticated
  USING (get_user_role() = 'system_admin')
  WITH CHECK (get_user_role() = 'system_admin');
CREATE POLICY "users_hr_update" ON users FOR UPDATE TO authenticated
  USING (get_user_role() IN ('hr_head','head_of_operations'))
  WITH CHECK (get_user_role() IN ('hr_head','head_of_operations'));

-- SHIFTS
CREATE POLICY "shifts_select" ON shifts FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR can_access_store(store_id));
CREATE POLICY "shifts_insert" ON shifts FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'store_manager' AND store_id = get_user_store_id());
CREATE POLICY "shifts_update" ON shifts FOR UPDATE TO authenticated
  USING (get_user_role() = 'store_manager' AND store_id = get_user_store_id());
CREATE POLICY "shifts_delete" ON shifts FOR DELETE TO authenticated
  USING (get_user_role() = 'store_manager' AND store_id = get_user_store_id());

-- SCHEDULED BREAKS
CREATE POLICY "breaks_select" ON scheduled_breaks FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM shifts s WHERE s.id = shift_id AND (s.user_id = auth.uid() OR can_access_store(s.store_id))));

-- CLOCK EVENTS
CREATE POLICY "clock_select_own" ON clock_events FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR can_access_store(store_id));
CREATE POLICY "clock_insert_own" ON clock_events FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR get_user_role() = 'two_ic');

-- TIMESHEETS
CREATE POLICY "timesheets_select" ON timesheets FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR can_access_store(store_id) OR get_user_role() IN ('hr_head','accounts_head','head_of_operations'));
CREATE POLICY "timesheets_manage" ON timesheets FOR ALL TO authenticated
  USING (get_user_role() = 'store_manager' AND store_id = get_user_store_id())
  WITH CHECK (get_user_role() = 'store_manager' AND store_id = get_user_store_id());

-- LEAVE REQUESTS
CREATE POLICY "leave_select" ON leave_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR can_access_store(store_id) OR get_user_role() IN ('head_of_operations','hr_head'));
CREATE POLICY "leave_insert" ON leave_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "leave_update" ON leave_requests FOR UPDATE TO authenticated
  USING (can_access_store(store_id) OR get_user_role() IN ('head_of_operations','area_manager'));

-- LEAVE BALANCES
CREATE POLICY "leave_balances_select" ON leave_balances FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR get_user_role() IN ('head_of_operations','hr_head','store_manager','area_manager'));
CREATE POLICY "leave_balances_manage" ON leave_balances FOR ALL TO authenticated
  USING (get_user_role() IN ('hr_head','head_of_operations'))
  WITH CHECK (get_user_role() IN ('hr_head','head_of_operations'));

-- PAYROLL PERIODS
CREATE POLICY "payroll_select" ON payroll_periods FOR SELECT TO authenticated
  USING (get_user_role() IN ('accounts_head','head_of_operations'));
CREATE POLICY "payroll_manage" ON payroll_periods FOR ALL TO authenticated
  USING (get_user_role() IN ('accounts_head','head_of_operations'))
  WITH CHECK (get_user_role() IN ('accounts_head','head_of_operations'));

-- STORE REVENUE
CREATE POLICY "revenue_select" ON store_revenue FOR SELECT TO authenticated
  USING (can_access_store(store_id) OR get_user_role() = 'head_of_operations');
CREATE POLICY "revenue_insert" ON store_revenue FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('store_manager','head_of_operations') AND can_access_store(store_id));

-- AUDIT LOG
CREATE POLICY "audit_select" ON audit_log FOR SELECT TO authenticated
  USING (get_user_role() = 'system_admin');
CREATE POLICY "audit_insert" ON audit_log FOR INSERT TO authenticated
  WITH CHECK (true);

-- ================================================================
-- STORAGE BUCKET FOR SELFIES
-- ================================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('selfies', 'selfies', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "selfies_upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'selfies' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "selfies_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'selfies');

-- ================================================================
-- SEED DATA (3 stores + sample users)
-- NOTE: Auth users must be created separately in Supabase Auth
-- or via the seed script. See SETUP.md for instructions.
-- ================================================================

-- Stores
INSERT INTO stores (id, name, address, city, latitude, longitude, geofence_radius_meters) VALUES
  ('a0000001-0000-4000-8000-000000000001', 'Ponsonby', '237 Ponsonby Road', 'Auckland', -36.8523, 174.7477, 200),
  ('a0000001-0000-4000-8000-000000000002', 'Newmarket', '42 Broadway', 'Auckland', -36.8712, 174.7768, 200),
  ('a0000001-0000-4000-8000-000000000003', 'Takapuna', '15 Hurstmere Road', 'Auckland', -36.7872, 174.7752, 200)
ON CONFLICT (id) DO NOTHING;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE clock_events;
ALTER PUBLICATION supabase_realtime ADD TABLE shifts;
