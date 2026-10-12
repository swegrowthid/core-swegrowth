import { Link } from 'react-router';
import { activityPath, activityStatusLabel, isActivityOngoing, organizerOf, recurrenceLabel, type Activity, type CommunityGroup } from '~/lib/activities';
import { formatWibDate, formatWibTime, wibDayParts } from '~/lib/format';

/**
 * Agenda publik: tiap baris membuka detail event publik (daftar dari sana).
 * Event berulang sudah memakai jadwal sesi berikutnya (upcomingSessions).
 */
export function AgendaList({ activities, groups = [] }: { activities: Activity[]; groups?: CommunityGroup[] }) {
  return (
    <ul className="rows agenda-rows">
      {activities.map((a) => {
        const parts = a.starts_at ? wibDayParts(a.starts_at) : null;
        const organizer = organizerOf(a, groups);
        return (
          <li key={a.id}>
            <span className="date-tile">
              {parts ? <><b>{parts.day}</b><span>{parts.month}</span></> : <span>TBA</span>}
            </span>
            <div className="row-main">
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
