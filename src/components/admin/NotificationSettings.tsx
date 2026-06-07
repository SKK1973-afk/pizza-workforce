'use client';

import { useState } from 'react';
import type { NotificationPreferences } from '@/types';

const DEFAULT_PREFS: NotificationPreferences = {
  push_enabled: true,
  email_enabled: true,
  shift_published: true,
  break_reminder: true,
  missed_break: true,
  leave_request: true,
  leave_decision: true,
  roster_published: true,
  overtime_warning: true,
  geofence_exception: true,
};

const PREF_LABELS: Record<keyof NotificationPreferences, string> = {
  push_enabled: 'Push Notifications',
  email_enabled: 'Email Notifications',
  shift_published: 'Shift Published',
  break_reminder: 'Break Reminders',
  missed_break: 'Missed Break Alerts',
  leave_request: 'Leave Requests',
  leave_decision: 'Leave Decisions',
  roster_published: 'Roster Published',
  overtime_warning: 'Overtime Warnings',
  geofence_exception: 'Geofence Exceptions',
};

export function NotificationSettings() {
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFS);
  const [saved, setSaved] = useState(false);

  function toggle(key: keyof NotificationPreferences) {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  }

  function handleSave() {
    setSaved(true);
  }

  return (
    <div className="card space-y-4 max-w-lg">
      {(Object.keys(PREF_LABELS) as (keyof NotificationPreferences)[]).map((key) => (
        <label key={key} className="flex items-center justify-between gap-4 cursor-pointer">
          <span className="text-sm font-medium">{PREF_LABELS[key]}</span>
          <input
            type="checkbox"
            checked={prefs[key]}
            onChange={() => toggle(key)}
            className="w-5 h-5 rounded border-slate-300 text-info focus:ring-info"
          />
        </label>
      ))}

      <div className="pt-4 border-t border-slate-200 flex items-center gap-4">
        <button onClick={handleSave} className="btn-primary">Save Defaults</button>
        {saved && <span className="text-sm text-compliant">Settings saved</span>}
      </div>

      <p className="text-xs text-slate-400">
        These defaults apply to new users. Individual users can override in their personal settings.
      </p>
    </div>
  );
}
