import { Link } from 'react-router';
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
export const byEventDate = (a: Recommendation, b: Recommendation) =>
  (a.event_date ?? '9999').localeCompare(b.event_date ?? '9999');

/**
 * Acara dari luar SWE Growth (rekomendasi kategori "acara" yang tayang dan
 * belum lewat). Tiap baris membuka situs penyelenggaranya.
 */
export function ExternalEventList({ events }: { events: Recommendation[] }) {
  return (
    <div className="panel external-events">
      <div className="panel-head">
        <h2>Acara dari luar yang kami rekomendasikan</h2>
        <Link to={directoryPath('acara')}>Lihat semua</Link>
      </div>
      {events.length === 0 ? (
        <p className="muted">Belum ada acara dari luar yang direkomendasikan.</p>
      ) : (
        <ul className="rows agenda-rows">
          {events.map((r) => {
            const parts = r.event_date ? dayParts(r.event_date) : null;
            return (
              <li key={r.id}>
                <span className="date-tile">
                  {parts ? <><b>{parts.day}</b><span>{parts.month}</span></> : <span>TBA</span>}
                </span>
                <div className="row-main">
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
      )}
      <p className="external-note">
        Diselenggarakan pihak lain, daftar langsung di situs mereka. Tahu acara bagus?{' '}
        <Link to={`${SUBMIT_PATH}?kategori=acara`}>Kirim rekomendasi</Link>.
      </p>
    </div>
  );
}
