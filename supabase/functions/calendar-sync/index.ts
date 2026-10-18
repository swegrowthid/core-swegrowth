// Samakan satu kegiatan dengan Google Calendar akun SWE Growth.
//
// Dipanggil swegrowth.id setelah peserta daftar/batal dan setelah admin
// menyimpan event. Fungsi ini idempoten: membuat event Google kalau belum ada,
// memperbarui judul/jadwal/lokasi, dan menyamakan daftar tamu dengan peserta
// berstatus `confirmed` (termasuk yang naik dari waitlist). Google sendiri yang
// mengirim undangan, perubahan jadwal, dan pembatalan ke email tamu.
// Tamu tidak bisa melihat tamu lain (guestsCanSeeOtherGuests: false).
//
// Secrets (supabase secrets set …):
//   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN  — OAuth akun Gmail SWE Growth
//   GOOGLE_CALENDAR_ID (opsional, default "primary"), SITE_URL (opsional, default https://swegrowth.id)
//
// Deploy: supabase functions deploy calendar-sync --no-verify-jwt
// (JWT diverifikasi di bawah lewat auth.getUser(); siapa pun yang login boleh
// memicu sinkron karena hasilnya selalu mengikuti isi database.)
import { createClient } from 'npm:@supabase/supabase-js@2';

const CALLERS = ['https://swegrowth.id', 'http://localhost:4321', 'http://localhost:5173'];

const cors = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && CALLERS.includes(origin) ? origin : CALLERS[0],
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  Vary: 'Origin',
});

type GoogleAttendee = { email: string; responseStatus?: string; organizer?: boolean; self?: boolean };
type GoogleEvent = {
  id: string;
  htmlLink: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: { dateTime?: string };
  end?: { dateTime?: string };
  recurrence?: string[];
  attendees?: GoogleAttendee[];
};

/** Sama dengan recurrenceRule() di app/lib/activities.ts. UNTIL = akhir hari WIB. */
function recurrenceRule(recurrence: string | null, until: string | null) {
  if (!recurrence) return null;
  const freq = recurrence === 'monthly' ? 'FREQ=MONTHLY' : `FREQ=WEEKLY${recurrence === 'biweekly' ? ';INTERVAL=2' : ''}`;
  return `RRULE:${freq}${until ? `;UNTIL=${until.replace(/-/g, '')}T165959Z` : ''}`;
}

const env = (name: string) => Deno.env.get(name) ?? '';

async function googleToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env('GOOGLE_CLIENT_ID'),
      client_secret: env('GOOGLE_CLIENT_SECRET'),
      refresh_token: env('GOOGLE_REFRESH_TOKEN'),
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error(`google_token_${res.status}: ${await res.text()}`);
  return (await res.json()).access_token as string;
}

async function google<T>(token: string, method: string, path: string, body?: unknown): Promise<T | null> {
  const calendarId = encodeURIComponent(env('GOOGLE_CALENDAR_ID') || 'primary');
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 404 || res.status === 410) return null;
  if (!res.ok) throw new Error(`google_${method}_${res.status}: ${await res.text()}`);
  return res.status === 204 ? null : ((await res.json()) as T);
}

const sameTime = (a?: string, b?: string) => Boolean(a && b && Date.parse(a) === Date.parse(b));

Deno.serve(async (req) => {
  const headers = { ...cors(req.headers.get('Origin')), 'Content-Type': 'application/json' };
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers });

  if (req.method === 'OPTIONS') return new Response(null, { headers });
  if (req.method !== 'POST') return reply(405, { error: 'method_not_allowed' });

  // Sebelum OAuth Google disiapkan, app tetap jalan normal.
  if (!env('GOOGLE_REFRESH_TOKEN') || !env('GOOGLE_CLIENT_ID') || !env('GOOGLE_CLIENT_SECRET')) {
    return reply(200, { status: 'not_configured' });
  }

  const { activity_id: activityId, check } = await req.json().catch(() => ({}));

  // Cek koneksi tanpa mengubah apa pun: tukar token lalu baca 1 event (cukup izin calendar.events).
  if (check === true) {
    try {
      const token = await googleToken();
      const list = await google<{ timeZone?: string; items?: unknown[] }>(token, 'GET', '?maxResults=1');
      return reply(200, { status: 'ok', timeZone: list?.timeZone ?? null });
    } catch (e) {
      return reply(502, { status: 'error', detail: String(e).slice(0, 300) });
    }
  }

  if (typeof activityId !== 'string') return reply(400, { error: 'activity_id_required' });

  const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const jwt = req.headers.get('Authorization')?.replace(/^Bearer /, '');
  const { data: userData } = jwt ? await db.auth.getUser(jwt) : { data: { user: null } };
  if (!userData.user) return reply(401, { error: 'login_required' });

  const [{ data: a }, { data: info }, { data: regs }] = await Promise.all([
    db.from('activities').select('*').eq('id', activityId).maybeSingle(),
    db.from('activity_member_info').select('meeting_url').eq('activity_id', activityId).maybeSingle(),
    db.from('activity_registrations').select('email').eq('activity_id', activityId).eq('status', 'confirmed'),
  ]);
  if (!a) return reply(404, { error: 'activity_not_found' });

  const saveLink = (event: GoogleEvent | null) =>
    db
      .from('activities')
      .update({
        google_event_id: event?.id ?? null,
        google_event_url: event?.htmlLink ?? null,
        calendar_synced_at: new Date().toISOString(),
      })
      .eq('id', a.id);

  try {
    const token = await googleToken();

    // Kegiatan dibatalkan: batalkan event Google (Google mengabari semua tamu).
    if (a.status === 'cancelled') {
      if (a.google_event_id) await google(token, 'DELETE', `/${a.google_event_id}?sendUpdates=all`);
      await saveLink(null);
      return reply(200, { status: 'cancelled' });
    }
    if (!a.starts_at) return reply(200, { status: 'skipped', reason: 'no_schedule' });

    const site = env('SITE_URL') || 'https://swegrowth.id';
    const page = `${site}/agenda/${a.slug}`;
    const end = a.ends_at ?? new Date(Date.parse(a.starts_at) + 60 * 60 * 1000).toISOString();
    const meetingUrl = info?.meeting_url ?? null;
    const description = [
      a.summary,
      a.speaker && `Bersama ${a.speaker}${a.speaker_title ? `, ${a.speaker_title}` : ''}`,
      meetingUrl && `Link meeting: <a href="${meetingUrl}">${meetingUrl}</a>`,
      `Detail & pendaftaranmu: <a href="${page}/terdaftar">${page}/terdaftar</a>`,
      'SWE Growth — komunitas software engineer Indonesia',
    ]
      .filter(Boolean)
      .join('<br><br>');
    // Event berulang: satu event Google berpola; tamu ikut semua sesi.
    const rule = recurrenceRule(a.recurrence, a.recurrence_until);
    const details = {
      summary: a.title,
      description,
      location: meetingUrl ?? a.location ?? '',
      start: { dateTime: a.starts_at, timeZone: 'Asia/Jakarta' },
      end: { dateTime: end, timeZone: 'Asia/Jakarta' },
      recurrence: rule ? [rule] : [],
    };
    const wanted = [...new Set((regs ?? []).map((r) => r.email.toLowerCase()))];

    const existing = a.google_event_id ? await google<GoogleEvent>(token, 'GET', `/${a.google_event_id}`) : null;

    if (!existing || existing.status === 'cancelled') {
      const created = await google<GoogleEvent>(token, 'POST', '?sendUpdates=all', {
        ...details,
        attendees: wanted.map((email) => ({ email })),
        guestsCanSeeOtherGuests: false,
        guestsCanInviteOthers: false,
        guestsCanModify: false,
        source: { title: 'SWE Growth', url: page },
      });
      await saveLink(created);
      return reply(200, { status: 'created', invited: wanted.length, url: created?.htmlLink });
    }

    // Pertahankan status RSVP tamu lama; tambah yang baru, buang yang batal.
    const current = existing.attendees ?? [];
    const kept = current.filter((g) => g.organizer || g.self || wanted.includes(g.email.toLowerCase()));
    const added = wanted.filter((email) => !current.some((g) => g.email.toLowerCase() === email));
    const removed = current.length - kept.length;

    const detailsChanged =
      existing.summary !== details.summary ||
      (existing.description ?? '') !== details.description ||
      (existing.location ?? '') !== details.location ||
      !sameTime(existing.start?.dateTime, details.start.dateTime) ||
      !sameTime(existing.end?.dateTime, details.end.dateTime) ||
      (existing.recurrence ?? []).join() !== details.recurrence.join();

    if (!detailsChanged && added.length === 0 && removed === 0) {
      await saveLink(existing);
      return reply(200, { status: 'unchanged', invited: wanted.length, url: existing.htmlLink });
    }

    const updated = await google<GoogleEvent>(token, 'PATCH', `/${existing.id}?sendUpdates=all`, {
      ...details,
      attendees: [...kept, ...added.map((email) => ({ email }))],
      guestsCanSeeOtherGuests: false,
    });
    await saveLink(updated);
    return reply(200, { status: 'updated', invited: wanted.length, added: added.length, removed, url: updated?.htmlLink });
  } catch (e) {
    console.error(e);
    return reply(502, { error: 'google_failed', detail: String(e).slice(0, 300) });
  }
});
