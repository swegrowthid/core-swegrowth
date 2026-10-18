import { isoDate } from '~/lib/format';

const DAY_MS = 86_400_000;
const WIB_MS = 7 * 60 * 60 * 1000;
/** Baru = tayang dalam 7 hari terakhir. */
const NEW_DAYS = 7;
/** Segera = mulai hari ini sampai 3 hari lagi. */
const SOON_DAYS = 3;

/** Tanggal WIB (yyyy-mm-dd) dari timestamp. */
export const wibDay = (ts: string | number) => isoDate(new Date(new Date(ts).getTime() + WIB_MS));

/** "Hari ini", "Besok", "3 hari lagi"; null kalau masih jauh, sudah lewat, atau tanpa tanggal. */
export function soonLabel(day: string | null, now: number) {
  if (!day) return null;
  const days = Math.round((Date.parse(day) - Date.parse(wibDay(now))) / DAY_MS);
  if (days < 0 || days > SOON_DAYS) return null;
  return days === 0 ? 'Hari ini' : days === 1 ? 'Besok' : `${days} hari lagi`;
}

export const isFresh = (createdAt: string, now: number) => now - Date.parse(createdAt) < NEW_DAYS * DAY_MS;

export type EventFlags = { soon: string | null; fresh: boolean };

/**
 * Penanda di baris agenda. `now` null saat prerender, jadi tanda baru muncul
 * di browser dan tidak basi di HTML hasil build.
 */
export function eventFlags(day: string | null, createdAt: string, now: number | null): EventFlags {
  if (now === null) return { soon: null, fresh: false };
  return { soon: soonLabel(day, now), fresh: isFresh(createdAt, now) };
}

/** Class untuk <li>: ornamen di kotak tanggal. */
export const flagClass = ({ soon, fresh }: EventFlags) =>
  [soon && 'is-soon', fresh && 'is-new'].filter(Boolean).join(' ') || undefined;

export function EventBadges({ soon, fresh }: EventFlags) {
  if (!soon && !fresh) return null;
  return (
    <span className="event-badges">
      {soon && <span className="event-badge soon"><i aria-hidden="true" />{soon}</span>}
      {fresh && <span className="event-badge new"><i aria-hidden="true">✦</i>Baru</span>}
    </span>
  );
}
