export type UserRole =
  | 'head_of_operations'
  | 'system_admin'
  | 'hr_head'
  | 'accounts_head'
  | 'area_manager'
  | 'store_manager'
  | 'two_ic'
  | 'team_member';

export type ContractType =
  | 'permanent_fulltime'
  | 'permanent_parttime'
  | 'casual'
  | 'fixed_term';

export type ShiftType = 'morning' | 'evening' | 'close' | 'split';

export type BreakType = 'rest' | 'lunch';

export type ClockEventType =
  | 'clock_in'
  | 'rest_break_start'
  | 'rest_break_end'
  | 'lunch_break_start'
  | 'lunch_break_end'
  | 'clock_out';

export type LeaveType = 'annual' | 'sick' | 'bereavement' | 'unpaid' | 'other';

export type LeaveStatus = 'pending' | 'approved' | 'declined';

export type TimesheetStatus = 'draft' | 'pending_approval' | 'approved' | 'exported';

export type VerificationMethod = 'geofence' | 'selfie' | 'manual';

export interface Store {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  latitude: number;
  longitude: number;
  geofence_radius_meters: number;
  is_active: boolean;
  created_at: string;
}

export interface User {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  store_id: string | null;
  area_store_ids: string[] | null;
  ird_number: string | null;
  contract_type: ContractType | null;
  wage_rate: number | null;
  kiwisaver_rate: number;
  is_active: boolean;
  date_of_birth: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Shift {
  id: string;
  store_id: string;
  user_id: string;
  shift_date: string;
  scheduled_start: string;
  scheduled_end: string;
  shift_type: ShiftType | null;
  week_start_date: string;
  notes: string | null;
  published: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduledBreak {
  id: string;
  shift_id: string;
  break_type: BreakType;
  is_paid: boolean;
  duration_minutes: number;
  scheduled_time: string;
  created_at: string;
}

export interface ClockEvent {
  id: string;
  shift_id: string | null;
  user_id: string;
  store_id: string;
  event_type: ClockEventType;
  event_time: string;
  latitude: number | null;
  longitude: number | null;
  distance_from_store_meters: number | null;
  verification_method: VerificationMethod | null;
  selfie_photo_url: string | null;
  manual_reason: string | null;
  is_approved: boolean;
  approved_by: string | null;
  created_at: string;
}

export interface Timesheet {
  id: string;
  user_id: string;
  store_id: string;
  week_start_date: string;
  ordinary_hours: number;
  overtime_hours: number;
  public_holiday_hours: number;
  paid_break_minutes: number;
  unpaid_break_minutes: number;
  gross_pay: number | null;
  status: TimesheetStatus;
  approved_by: string | null;
  approved_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeaveRequest {
  id: string;
  user_id: string;
  store_id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  days_requested: number;
  notes: string | null;
  status: LeaveStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  decline_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeaveBalance {
  id: string;
  user_id: string;
  leave_type: string;
  balance_days: number;
  accrued_days: number;
  used_days: number;
  year: number;
  updated_at: string;
}

export interface AuditLogEntry {
  id: string;
  user_id: string | null;
  action: string;
  table_name: string | null;
  record_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface NotificationPreferences {
  push_enabled: boolean;
  email_enabled: boolean;
  shift_published: boolean;
  break_reminder: boolean;
  missed_break: boolean;
  leave_request: boolean;
  leave_decision: boolean;
  roster_published: boolean;
  overtime_warning: boolean;
  geofence_exception: boolean;
}
