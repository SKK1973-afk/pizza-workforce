-- Run this in Supabase SQL Editor if roster shifts fail to save
-- Fixes: break trigger blocked by RLS

CREATE OR REPLACE FUNCTION public.create_scheduled_breaks()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
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

-- Add published column if missing
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT false;
