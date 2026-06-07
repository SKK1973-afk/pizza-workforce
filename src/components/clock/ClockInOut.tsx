'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { haversineDistanceMeters, isWithinGeofence } from '@/lib/geofence';
import type { ClockEvent, Store, User } from '@/types';
import { format, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { NZ_TIMEZONE } from '@/lib/nz-employment';

type ClockState = 'out' | 'in' | 'rest' | 'lunch';

export function ClockInOut({ user, store }: { user: User; store: Store }) {
  const supabase = createClient();
  const [state, setState] = useState<ClockState>('out');
  const [events, setEvents] = useState<ClockEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSelfie, setShowSelfie] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [nextBreak, setNextBreak] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    const today = formatInTimeZone(new Date(), NZ_TIMEZONE, 'yyyy-MM-dd');
    const { data } = await supabase
      .from('clock_events')
      .select('*')
      .eq('user_id', user.id)
      .gte('event_time', `${today}T00:00:00`)
      .order('event_time', { ascending: true });
    if (data) {
      setEvents(data as ClockEvent[]);
      const last = data[data.length - 1];
      if (!last) setState('out');
      else if (last.event_type === 'clock_in') setState('in');
      else if (last.event_type === 'rest_break_start') setState('rest');
      else if (last.event_type === 'lunch_break_start') setState('lunch');
      else if (last.event_type === 'clock_out') setState('out');
      else setState('in');
    }
  }, [supabase, user.id]);

  useEffect(() => {
    loadEvents();
    const channel = supabase
      .channel('clock-events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clock_events', filter: `user_id=eq.${user.id}` }, () => loadEvents())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadEvents, supabase, user.id]);

  async function getLocation(): Promise<{ lat: number; lon: number } | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }

  async function recordEvent(
    eventType: ClockEvent['event_type'],
    verification: 'geofence' | 'selfie' | 'manual' = 'geofence',
    selfieUrl?: string
  ) {
    setLoading(true);
    setError('');
    const loc = await getLocation();
    let distance: number | null = null;
    let method = verification;

    if (loc) {
      distance = haversineDistanceMeters(loc.lat, loc.lon, store.latitude, store.longitude);
      if (eventType === 'clock_in' && verification === 'geofence') {
        if (!isWithinGeofence(loc.lat, loc.lon, store.latitude, store.longitude, store.geofence_radius_meters)) {
          setShowSelfie(true);
          setLoading(false);
          return;
        }
      }
    }

    const { error: insertError } = await supabase.from('clock_events').insert({
      user_id: user.id,
      store_id: store.id,
      event_type: eventType,
      latitude: loc?.lat,
      longitude: loc?.lon,
      distance_from_store_meters: distance,
      verification_method: method,
      selfie_photo_url: selfieUrl,
      is_approved: method !== 'selfie',
    });

    if (insertError) {
      setError(insertError.message);
    } else {
      await loadEvents();
      if (eventType === 'clock_out') {
        await fetch('/api/timesheets/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id }),
        });
      }
    }
    setLoading(false);
  }

  async function handleClockIn() {
    await recordEvent('clock_in');
  }

  async function handleClockOut() {
    await recordEvent('clock_out');
  }

  async function handleRestBreak() {
    if (state === 'in') await recordEvent('rest_break_start');
    else if (state === 'rest') await recordEvent('rest_break_end');
  }

  async function handleLunchBreak() {
    if (state === 'in') await recordEvent('lunch_break_start');
    else if (state === 'lunch') await recordEvent('lunch_break_end');
  }

  async function captureSelfie() {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setStream(mediaStream);
    } catch {
      setError('Camera access denied. Please allow camera access or ask your manager to clock you in manually.');
    }
  }

  async function uploadSelfie(video: HTMLVideoElement) {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.8));
    if (!blob) return;

    const fileName = `${user.id}/${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage.from('selfies').upload(fileName, blob);
    if (uploadError) { setError(uploadError.message); return; }

    const { data: urlData } = supabase.storage.from('selfies').getPublicUrl(fileName);
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    setShowSelfie(false);
    await recordEvent('clock_in', 'selfie', urlData.publicUrl);
  }

  function calcPaidHours(): number {
    let total = 0;
    let clockIn: Date | null = null;
    let lunchStart: Date | null = null;
    for (const ev of events) {
      const t = parseISO(ev.event_time);
      if (ev.event_type === 'clock_in') clockIn = t;
      if (ev.event_type === 'lunch_break_start') lunchStart = t;
      if (ev.event_type === 'lunch_break_end' && lunchStart) {
        total -= (t.getTime() - lunchStart.getTime()) / 3600000;
        lunchStart = null;
      }
      if (ev.event_type === 'clock_out' && clockIn) {
        total += (t.getTime() - clockIn.getTime()) / 3600000;
        clockIn = null;
      }
    }
    if (clockIn) total += (Date.now() - clockIn.getTime()) / 3600000;
    return Math.max(0, Math.round(total * 100) / 100);
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Clock In / Out</h1>
        <p className="text-slate-500">{store.name}</p>
      </div>

      {error && <p className="text-breach bg-red-50 p-3 rounded-lg text-sm">{error}</p>}

      {showSelfie && (
        <div className="card space-y-4">
          <p className="text-sm">You are outside the store geofence. Please take a selfie to verify your location.</p>
          {!stream ? (
            <button onClick={captureSelfie} className="btn-primary w-full">Open Camera</button>
          ) : (
            <div>
              <video ref={(el) => { if (el && stream) el.srcObject = stream; el?.play(); }} className="w-full rounded-lg" autoPlay playsInline muted />
              <button onClick={(e) => { const v = (e.target as HTMLElement).parentElement?.querySelector('video'); if (v) uploadSelfie(v); }} className="btn-primary w-full mt-3">Take Selfie & Clock In</button>
            </div>
          )}
          <button onClick={() => { stream?.getTracks().forEach((t) => t.stop()); setShowSelfie(false); }} className="btn-secondary w-full">Cancel</button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <button onClick={handleClockIn} disabled={loading || state !== 'out'} className="btn-success text-lg py-6 disabled:opacity-40">
          Clock In
        </button>
        <button onClick={handleClockOut} disabled={loading || state === 'out'} className="btn-danger text-lg py-6 disabled:opacity-40">
          Clock Out
        </button>
        <button onClick={handleRestBreak} disabled={loading || !['in', 'rest'].includes(state)} className="btn-secondary text-lg py-6 disabled:opacity-40">
          {state === 'rest' ? 'End Rest Break' : 'Rest Break'}
          <span className="block text-xs font-normal mt-1">Paid 10 min</span>
        </button>
        <button onClick={handleLunchBreak} disabled={loading || !['in', 'lunch'].includes(state)} className="btn-secondary text-lg py-6 disabled:opacity-40">
          {state === 'lunch' ? 'End Lunch Break' : 'Lunch Break'}
          <span className="block text-xs font-normal mt-1">Unpaid 30 min</span>
        </button>
      </div>

      {nextBreak && (
        <p className="text-center text-sm text-info bg-blue-50 p-3 rounded-lg">
          Your next break is at {nextBreak}
        </p>
      )}

      <div className="card">
        <h2 className="font-semibold mb-3">Today&apos;s Time Log</h2>
        {events.length === 0 ? (
          <p className="text-slate-500 text-sm">No clock events yet today. Tap Clock In to start your shift.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {events.map((ev) => (
              <li key={ev.id} className="flex justify-between border-b border-slate-100 pb-2">
                <span className="capitalize">{ev.event_type.replace(/_/g, ' ')}</span>
                <span className="text-slate-500">
                  {formatInTimeZone(parseISO(ev.event_time), NZ_TIMEZONE, 'h:mm a')}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 font-semibold">Total paid hours: {calcPaidHours()}h</p>
      </div>
    </div>
  );
}
