// Tanggal konten (yyyy-mm-dd) diformat dalam UTC supaya harinya tidak bergeser;
// timestamp dari Supabase diformat dalam WIB.
const dateFmt = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

const shortDateFmt = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

const wibDateFmt = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Asia/Jakarta',
});

const wibTimeFmt = new Intl.DateTimeFormat('id-ID', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Jakarta',
});

const wibPartsFmt = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' });

const toDate = (d: Date | string) => (typeof d === 'string' ? new Date(d) : d);

export const formatDate = (d: Date | string) => dateFmt.format(toDate(d));
export const formatShortDate = (d: Date | string) => shortDateFmt.format(toDate(d));

const wibWeekdayFmt = new Intl.DateTimeFormat('id-ID', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Asia/Jakarta',
});

/** Timestamp activity → "Sabtu, 10 Oktober 2026". */
export const formatWibDay = (ts: string) => wibWeekdayFmt.format(new Date(ts));

/** Timestamp activity → "12 Oktober 2026". */
export const formatWibDate = (ts: string) => wibDateFmt.format(new Date(ts));
/** Timestamp activity → "19.30 WIB". */
export const formatWibTime = (ts: string) => `${wibTimeFmt.format(new Date(ts))} WIB`;
/** Untuk kotak tanggal kecil: { day: "12", month: "Okt" }. */
export const wibDayParts = (ts: string) => {
  const parts = wibPartsFmt.formatToParts(new Date(ts));
  return {
    day: parts.find((p) => p.type === 'day')?.value ?? '',
    month: (parts.find((p) => p.type === 'month')?.value ?? '').replace('.', ''),
  };
};

/** ISO yyyy-mm-dd for <time datetime> */
export const isoDate = (d: Date) => d.toISOString().slice(0, 10);

/** Events are day-granular, so "upcoming" holds until the end of the event day. */
export const isUpcoming = (d: Date, now = new Date()) => d.getTime() + 24 * 60 * 60 * 1000 > now.getTime();

export const isUpcomingDay = (day: string, now = new Date()) => isUpcoming(new Date(day), now);

export const relativeFromNow = (ts: string, now = new Date()) => {
  const days = Math.round((new Date(ts).getTime() - now.getTime()) / 86_400_000);
  if (days === 0) return 'hari ini';
  if (days === 1) return 'besok';
  if (days > 1) return `${days} hari lagi`;
  return `${-days} hari lalu`;
};
