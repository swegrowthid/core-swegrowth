import { describe, expect, it } from 'vitest';
import {
  countdown,
  isActivityUpcoming,
  linkedinHandle,
  nextSession,
  recurrenceRule,
  registrationCode,
  slugify,
  upcomingSessions,
  type Activity,
} from './activities';

const at = (iso: string) => new Date(iso);

/** Event minimal untuk test; field lain tidak dipakai fungsi jadwal. */
const event = (over: Partial<Activity>) =>
  ({
    id: 'x',
    title: 'Event',
    status: 'registration_open',
    starts_at: null,
    ends_at: null,
    recurrence: null,
    recurrence_until: null,
    ...over,
  }) as Activity;

describe('nextSession', () => {
  it('event biasa tetap tampil sampai akhir harinya', () => {
    const a = event({ starts_at: '2026-10-20T06:00:00.000Z', ends_at: '2026-10-20T07:00:00.000Z' });
    expect(nextSession(a, at('2026-10-18T00:00:00Z'))).toEqual({ starts_at: a.starts_at, ends_at: a.ends_at });
    expect(nextSession(a, at('2026-10-21T08:00:00Z'))).toBeNull();
  });

  it('mingguan: melompat ke sesi berikutnya', () => {
    const a = event({ starts_at: '2026-10-01T12:00:00.000Z', ends_at: '2026-10-01T13:30:00.000Z', recurrence: 'weekly' });
    expect(nextSession(a, at('2026-10-17T00:00:00Z'))).toEqual({
      starts_at: '2026-10-22T12:00:00.000Z',
      ends_at: '2026-10-22T13:30:00.000Z',
    });
  });

  it('dua minggu sekali', () => {
    const a = event({ starts_at: '2026-10-01T12:00:00.000Z', recurrence: 'biweekly' });
    expect(nextSession(a, at('2026-10-17T00:00:00Z'))?.starts_at).toBe('2026-10-29T12:00:00.000Z');
  });

  it('bulanan: mundur ke akhir bulan kalau tanggalnya tidak ada', () => {
    const a = event({ starts_at: '2026-01-31T03:00:00.000Z', recurrence: 'monthly' });
    expect(nextSession(a, at('2026-02-10T00:00:00Z'))?.starts_at).toBe('2026-02-28T03:00:00.000Z');
  });

  it('berhenti setelah recurrence_until', () => {
    const a = event({ starts_at: '2026-10-01T12:00:00.000Z', recurrence: 'weekly', recurrence_until: '2026-10-20' });
    expect(nextSession(a, at('2026-10-17T00:00:00Z'))).toBeNull();
    expect(isActivityUpcoming(a, at('2026-10-17T00:00:00Z'))).toBe(false);
  });

  it('event selesai atau batal tidak dianggap akan datang', () => {
    const a = event({ starts_at: '2026-12-01T12:00:00.000Z', status: 'cancelled' });
    expect(isActivityUpcoming(a, at('2026-10-17T00:00:00Z'))).toBe(false);
  });
});

describe('upcomingSessions', () => {
  it('mengurutkan berdasarkan sesi berikutnya, event tanpa jadwal di belakang', () => {
    const now = at('2026-10-17T00:00:00Z');
    const list = [
      event({ id: 'tanpa-jadwal' }),
      event({ id: 'november', starts_at: '2026-11-05T12:00:00.000Z' }),
      event({ id: 'mingguan', starts_at: '2026-10-01T12:00:00.000Z', recurrence: 'weekly' }),
      event({ id: 'lewat', starts_at: '2026-10-01T12:00:00.000Z' }),
    ];
    expect(upcomingSessions(list, { now, undatedLast: true }).map((a) => a.id)).toEqual(['mingguan', 'november', 'tanpa-jadwal']);
  });
});

describe('recurrenceRule', () => {
  it('sesuai format RRULE Google Calendar', () => {
    expect(recurrenceRule(event({ recurrence: 'weekly', recurrence_until: '2026-12-31' }))).toBe(
      'RRULE:FREQ=WEEKLY;UNTIL=20261231T165959Z',
    );
    expect(recurrenceRule(event({ recurrence: 'biweekly' }))).toBe('RRULE:FREQ=WEEKLY;INTERVAL=2');
    expect(recurrenceRule(event({ recurrence: 'monthly' }))).toBe('RRULE:FREQ=MONTHLY');
    expect(recurrenceRule(event({}))).toBeNull();
  });
});

describe('countdown', () => {
  it('menghitung hari dalam WIB', () => {
    const now = at('2026-10-18T01:00:00Z'); // 08.00 WIB
    expect(countdown({ starts_at: '2026-10-18T16:30:00Z' }, now)).toBe('Hari ini'); // 23.30 WIB
    expect(countdown({ starts_at: '2026-10-18T17:30:00Z' }, now)).toBe('Besok'); // 00.30 WIB besoknya
    expect(countdown({ starts_at: '2026-10-21T03:00:00Z' }, now)).toBe('3 hari lagi');
    expect(countdown({ starts_at: '2026-10-17T03:00:00Z' }, now)).toBeNull();
  });
});

describe('helper teks', () => {
  it('slugify membuang aksen dan tanda baca', () => {
    expect(slugify('Kelas Online: Git Workflow — Café!')).toBe('kelas-online-git-workflow-cafe');
  });

  it('registrationCode', () => {
    expect(registrationCode('3f2a9c1e-0000-4000-8000-000000000000')).toBe('SWE-3F2A9C');
  });

  it('linkedinHandle', () => {
    expect(linkedinHandle('https://www.linkedin.com/in/ruby-abdullah/')).toBe('ruby-abdullah');
    expect(linkedinHandle('https://example.com/ruby')).toBeNull();
    expect(linkedinHandle(null)).toBeNull();
  });
});
