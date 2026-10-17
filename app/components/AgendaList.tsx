import { Link } from 'react-router';
import { activityPath, activityStatusLabel, isActivityOngoing, organizerOf, recurrenceLabel, type Activity, type CommunityGroup } from '~/lib/activities';
import { formatWibDate, formatWibTime, wibDayParts } from '~/lib/format';
import { EventBadges, eventFlags, flagClass, wibDay } from './EventBadges';

/**
 * Agenda publik: tiap baris membuka detail event publik (daftar dari sana).
 * Event berulang sudah memakai jadwal sesi berikutnya (upcomingSessions).
 * `now` (ms) menyalakan penanda "segera" dan "baru"; null = tanpa penanda.
 */
export function AgendaList({
  activities,
  groups = [],
  now = null,
}: {
  activities: Activity[];
  groups?: CommunityGroup[];
  now?: number | null;
}) {
  return (
    <ul className="rows agenda-rows">
      {activities.map((a) => {
        const parts = a.starts_at ? wibDayParts(a.starts_at) : null;
        const organizer = organizerOf(a, groups);
        const flags = eventFlags(a.starts_at && wibDay(a.starts_at), a.created_at, now);
        return (
          <li key={a.id} className={flagClass(flags)}>
            <span className="date-tile">
              {parts ? <><b>{parts.day}</b><span>{parts.month}</span></> : <span>TBA</span>}
            </span>
            <div className="row-main">
              <EventBadges {...flags} />
              <Link className="title" to={activityPath(a)}>{a.title}</Link>
              <span>
                {[
                  isActivityOngoing(a) && !a.recurrence ? `sedang berjalan s.d. ${formatWibDate(a.ends_at!)}` : a.starts_at ? formatWibTime(a.starts_at) : 'Jadwal menyusul',
                  recurrenceLabel(a),
                  a.mode,
                  organizer && `oleh ${organizer.name}`,
                  activityStatusLabel[a.status],
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
