'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import type { NotificationPreferences } from '@/types';

const PREF_LABELS: Record<string, string> = {
  push_enabled: 'Push Notifications',
  email_enabled: 'Email Notifications',
  shift_published: 'Shift Published',
  break_reminder: 'Break Reminders',
  leave_decision: 'Leave Decisions',
  roster_published: 'Roster Published',
};

export function PersonalSettings({ userId, kiwisaverRate }: { userId: string; kiwisaverRate: number }) {
  const supabase = createClient();
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [ksRate, setKsRate] = useState(String(kiwisaverRate));
  const [prefs, setPrefs] = useState<Partial<NotificationPreferences>>({
    push_enabled: true,
    email_enabled: true,
    shift_published: true,
    break_reminder: true,
    leave_decision: true,
    roster_published: true,
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSaved(false);

    const updates: Record<string, unknown> = {};
    if (phone) updates.phone = phone;
    const rate = parseFloat(ksRate);
    if (!isNaN(rate) && rate >= 3 && rate <= 10) updates.kiwisaver_rate = rate;

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase.from('users').update(updates).eq('id', userId);
      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }
    }

    setSaved(true);
    router.refresh();
    setLoading(false);
  }

  function togglePref(key: string) {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key as keyof NotificationPreferences] }));
    setSaved(false);
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {error && <p className="text-breach bg-red-50 p-3 rounded-lg text-sm">{error}</p>}

      <div className="card space-y-4">
        <h2 className="font-semibold">Profile</h2>
        <div>
          <label className="label">Phone Number</label>
          <input
            type="tel"
            className="input"
            placeholder="Update phone number..."
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div>
          <label className="label">KiwiSaver Rate (%)</label>
          <input
            type="number"
            min="3"
            max="10"
            step="1"
            className="input"
            value={ksRate}
            onChange={(e) => setKsRate(e.target.value)}
          />
        </div>
      </div>

      <div className="card space-y-4">
        <h2 className="font-semibold">Notifications</h2>
        {Object.entries(PREF_LABELS).map(([key, label]) => (
          <label key={key} className="flex items-center justify-between gap-4 cursor-pointer">
            <span className="text-sm">{label}</span>
            <input
              type="checkbox"
              checked={!!prefs[key as keyof NotificationPreferences]}
              onChange={() => togglePref(key)}
              className="w-5 h-5 rounded border-slate-300 text-info focus:ring-info"
            />
          </label>
        ))}
      </div>

      <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-40">
        Save Settings
      </button>
      {saved && <p className="text-sm text-compliant text-center">Settings saved successfully</p>}
    </form>
  );
}
