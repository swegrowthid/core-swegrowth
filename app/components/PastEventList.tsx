import { Link } from 'react-router';
import { activityPath, organizerOf, recurrenceLabel, type Activity, type CommunityGroup } from '~/lib/activities';
import { formatWibDate, wibDayParts } from '~/lib/format';

/**
 * Kegiatan lalu: tiap baris membuka detail event; yang punya dokumentasi
 * langsung ke galeri fotonya dan menampilkan foto pertama sebagai thumbnail.
 */
export function PastEventList({
  activities,
  groups = [],
  tagOf,
}: {
  activities: Activity[];
  groups?: CommunityGroup[];
  /** Label tambahan per event, mis. "kamu ikut" di portal. */
  tagOf?: (a: Activity) => string | null;
}) {
  return (
    <ul className="rows past-event-rows">
      {activities.map((a) => {
        const parts = a.starts_at ? wibDayParts(a.starts_at) : null;
        const organizer = organizerOf(a, groups);
        const photos = a.photos ?? [];
        const href = photos.length > 0 ? `${activityPath(a)}#dokumentasi` : activityPath(a);
        const tag = tagOf?.(a);
        return (
          <li key={a.id}>
            <span className="date-tile">
              {parts ? <><b>{parts.day}</b><span>{parts.month}</span></> : <span>—</span>}
            </span>
            <div className="row-main">
              <Link className="title" to={href}>{a.title}</Link>
              <span>
                {[
                  a.recurrence ? recurrenceLabel(a) : a.starts_at && formatWibDate(a.starts_at),
                  organizer && `oleh ${organizer.name}`,
                  photos.length > 0 ? `${photos.length} foto` : null,
                  tag,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </div>
            {photos.length > 0 && (
              <Link className="past-event-thumb" to={href} tabIndex={-1} aria-hidden="true">
                <img src={photos[0].url} alt="" loading="lazy" />
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
