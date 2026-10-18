import { Link } from 'react-router';
import { activityPath, priceLabel, timeRange, type Activity } from '~/lib/activities';
import { formatWibDate, wibDayParts } from '~/lib/format';

/** Ringkasan event di atas form & halaman konfirmasi pendaftaran. */
export function EventSummary({ activity: a }: { activity: Activity }) {
  const parts = a.starts_at ? wibDayParts(a.starts_at) : null;
  return (
    <div className="event-summary">
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
        <Link className="title" to={activityPath(a)}>
          {a.title}
        </Link>
        <span className="event-summary-meta">
          {[a.starts_at ? `${formatWibDate(a.starts_at)}, ${timeRange(a)}` : 'Jadwal menyusul', a.mode, priceLabel(a)]
            .filter(Boolean)
            .join(' · ')}
        </span>
      </div>
    </div>
  );
}
