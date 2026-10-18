import type { ActivityRow } from '~/lib/database.types';
import { type CalendarSyncResult } from '~/lib/activities';
import { formatWibDate, formatWibTime } from '~/lib/format';

export const calendarText = (r: CalendarSyncResult) =>
  r.error
    ? `Gagal sinkron: ${r.detail ?? r.error}`
    : r.status === 'not_configured'
      ? 'Google Calendar belum disambungkan (secrets GOOGLE_* belum diisi di Supabase).'
      : r.status === 'skipped'
        ? 'Belum bisa dibuat di Google Calendar: isi jadwal mulai dulu.'
        : r.status === 'cancelled'
          ? 'Event Google dibatalkan; tamu sudah dikabari.'
          : r.status === 'created'
            ? `Event Google dibuat, ${r.invited ?? 0} peserta diundang.`
            : r.status === 'updated'
              ? `Google Calendar diperbarui (${r.invited ?? 0} tamu).`
              : r.status === 'unchanged'
                ? `Sudah sinkron (${r.invited ?? 0} tamu).`
                : 'Menyinkronkan…';

/** Status sinkron: peserta terkonfirmasi = tamu event Google; Google yang mengirim undangan. */
export function CalendarPanel({
  activity: a,
  result,
  onSync,
}: {
  activity: ActivityRow;
  result: CalendarSyncResult | null;
  onSync: () => void;
}) {
  const busy = result !== null && result.status === undefined && !result.error;
  return (
    <div className={`calendar-panel${result?.error ? ' error' : ''}`}>
      <div>
        <strong>Google Calendar</strong>
        <span>
          {result
            ? calendarText(result)
            : a.google_event_id
              ? `Tersinkron ${a.calendar_synced_at ? `${formatWibDate(a.calendar_synced_at)}, ${formatWibTime(a.calendar_synced_at)}` : ''}. Peserta terkonfirmasi otomatis jadi tamu.`
              : 'Belum ada event Google. Sinkronkan untuk membuatnya dan mengundang peserta yang sudah terdaftar.'}
        </span>
      </div>
      <div className="inline-actions">
        {a.google_event_url && (
          <a className="btn btn-ghost sm" href={a.google_event_url} target="_blank" rel="noopener">
            Buka di Calendar ↗
          </a>
        )}
        <button className="btn btn-ghost sm" type="button" disabled={busy} onClick={onSync}>
          {busy ? 'Menyinkronkan…' : 'Sinkronkan sekarang'}
        </button>
      </div>
    </div>
  );
}
