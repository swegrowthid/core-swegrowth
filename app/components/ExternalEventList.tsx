import { Link } from 'react-router';
import { EventBadges, eventFlags, flagClass } from './EventBadges';
import { ArrowUpRight } from './Icons';
import { directoryPath, PRICE_LABEL, SUBMIT_PATH, type Recommendation } from '~/lib/recommendations';

const partsFmt = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** Tanggal acara (yyyy-mm-dd) → { day: "12", month: "Okt" }, tanpa geser hari. */
const dayParts = (day: string) => {
  const parts = partsFmt.formatToParts(new Date(day));
  return {
    day: parts.find((p) => p.type === 'day')?.value ?? '',
    month: (parts.find((p) => p.type === 'month')?.value ?? '').replace('.', ''),
  };
};

/** Acara rekomendasi yang tanggalnya terdekat dulu; yang belum ada tanggal di akhir. */
export const byEventDate = (a: Recommendation, b: Recommendation) => (a.event_date ?? '9999').localeCompare(b.event_date ?? '9999');

/**
 * Baris acara dari luar SWE Growth (rekomendasi kategori "acara" yang tayang
 * dan belum lewat). Tiap baris membuka situs penyelenggaranya.
 */
export function ExternalEventRows({ events, now = null }: { events: Recommendation[]; now?: number | null }) {
  return (
    <ul className="rows agenda-rows external-rows">
      {events.map((r) => {
        const parts = r.event_date ? dayParts(r.event_date) : null;
        const flags = eventFlags(r.event_date, r.created_at, now);
        return (
          <li key={r.id} className={flagClass(flags)}>
            <span className="date-tile">
              {parts ? (
                <>
                  <b>{parts.day}</b>
                  <span>{parts.month}</span>
                </>
              ) : (
                <span>TBA</span>
              )}
            </span>
            <div className="row-main">
              <EventBadges {...flags} />
              <a className="title" href={r.url} target="_blank" rel={r.is_affiliate ? 'noopener sponsored' : 'noopener'}>
                {r.title} <ArrowUpRight />
              </a>
              <span>
                {[r.organizer && `oleh ${r.organizer}`, r.event_mode, r.location, r.price && PRICE_LABEL[r.price]]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
              <span className="external-reason">{r.reason}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Panel acara dari luar di halaman agenda. */
export function ExternalEventList({ events, now = null }: { events: Recommendation[]; now?: number | null }) {
  return (
    <div className="panel external-events">
      <div className="panel-head">
        <div>
          <h2>Tempat lain untuk tumbuh</h2>
          <p className="muted">Acara pilihan di luar SWE Growth yang menurut kami layak didatangi.</p>
        </div>
        <Link to={directoryPath('acara')}>Lihat semua</Link>
      </div>
      {events.length === 0 ? (
        <p className="muted">Belum ada acara dari luar yang direkomendasikan.</p>
      ) : (
        <ExternalEventRows events={events} now={now} />
      )}
      <p className="external-note">
        Diselenggarakan pihak lain, daftar langsung di situs mereka. Tahu acara bagus?{' '}
        <Link to={`${SUBMIT_PATH}?kategori=acara`}>Kirim rekomendasi</Link>.
      </p>
    </div>
  );
}
