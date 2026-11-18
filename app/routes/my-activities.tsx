import { Link } from 'react-router';
import type { Route } from './+types/my-activities';
import { byEventDate, ExternalEventRows } from '~/components/ExternalEventList';
import { EventRows, LoadError, PortalPage, PortalSection } from '~/components/Portal';
import {
  activityPath,
  activityStatusLabel,
  fetchMyRegistrationStatuses,
  getPublishedActivities,
  timeRange,
  upcomingSessions,
  type Activity,
} from '~/lib/activities';
import { requireUser } from '~/lib/auth';
import { formatWibDate, wibDayParts } from '~/lib/format';
import { feedbackOpen, fetchMyFeedbackIds, myActivityPath, splitMyActivities, type MyActivity } from '~/lib/my-activities';
import { directoryPath, getPublishedRecommendations, SUBMIT_PATH } from '~/lib/recommendations';
import { youtubeId } from '~/lib/youtube';

export const meta: Route.MetaFunction = () => [{ title: 'Kegiatan — SWE Growth' }, { name: 'robots', content: 'noindex' }];

const EXTERNAL_LIMIT = 4;

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const user = await requireUser(request);
  // Gagal muat = null, supaya tidak tampil seolah kamu belum ikut apa pun.
  const [regs, activities, feedbackIds, recommendations] = await Promise.all([
    fetchMyRegistrationStatuses(user.id).catch(() => null),
    getPublishedActivities({ strict: true }).catch(() => null),
    fetchMyFeedbackIds(user.id),
    getPublishedRecommendations({ strict: true }).catch(() => null),
  ]);
  const external =
    recommendations
      ?.filter((r) => r.category === 'acara')
      .sort(byEventDate)
      .slice(0, EXTERNAL_LIMIT) ?? null;
  if (!regs || !activities) return { failed: true as const, external, now: Date.now() };

  const registered = new Set(regs.filter((r) => r.status !== 'cancelled').map((r) => r.activity_id));
  return {
    failed: false as const,
    ...splitMyActivities(activities, regs),
    others: upcomingSessions(activities, { undatedLast: true }).filter((a) => !registered.has(a.id)),
    feedbackIds,
    external,
    now: Date.now(),
  };
}

export function HydrateFallback() {
  return <div className="loading-block">Memuat kegiatan…</div>;
}

/**
 * Kegiatan: yang kamu ikuti (tiap baris membuka rekap: ringkasan, rekaman,
 * feedback), agenda yang bisa didaftar, dan acara pilihan dari luar.
 */
export default function MyActivities({ loaderData }: Route.ComponentProps) {
  return (
    <PortalPage
      title="Kegiatan"
      intro="Sesi yang kamu ikuti beserta rekap dan feedback-nya, rekaman semua sesi, agenda berikutnya, dan acara pilihan dari luar."
    >
      {loaderData.failed ? <LoadError what="Kegiatanmu" /> : <OwnActivities {...loaderData} />}

      {loaderData.external === null ? (
        <PortalSection title="Rekomendasi dari luar">
          <LoadError what="Acara rekomendasi" />
        </PortalSection>
      ) : (
        loaderData.external.length > 0 && (
          <PortalSection title="Rekomendasi dari luar" link={{ to: directoryPath('acara'), label: 'Semua acara' }}>
            <div className="panel">
              <ExternalEventRows events={loaderData.external} now={loaderData.now} />
              <p className="external-note">
                Diselenggarakan pihak lain, daftar langsung di situs mereka. Tahu acara bagus?{' '}
                <Link to={`${SUBMIT_PATH}?kategori=acara`}>Kirim rekomendasi</Link>.
              </p>
            </div>
          </PortalSection>
        )
      )}
    </PortalPage>
  );
}

function OwnActivities({ upcoming, past, others, feedbackIds, now }: Extract<Route.ComponentProps['loaderData'], { failed: false }>) {
  return (
    <>
      <PortalSection id="akan-datang" title="Kamu terdaftar">
        {upcoming.length > 0 ? (
          <div className="panel">
            <MyRows items={upcoming} chips={(m) => [m.status === 'waitlisted' ? 'waitlist' : 'terdaftar']} />
          </div>
        ) : (
          <p className="psec-empty">
            Belum ada sesi yang kamu ikuti.{' '}
            {others.length > 0 ? 'Pilih dari daftar di bawah, pendaftarannya gratis.' : 'Sesi baru diumumkan di grup komunitas.'}
          </p>
        )}
      </PortalSection>

      {others.length > 0 && (
        <PortalSection title="Akan datang" link={{ to: '/agenda', label: 'Agenda lengkap' }}>
          <div className="panel">
            <EventRows items={others.map((a) => ({ activity: a, tag: activityStatusLabel[a.status], href: activityPath(a) }))} />
          </div>
        </PortalSection>
      )}

      {/* Selalu tampil: rekaman semua sesi publik ada di /rekaman, termasuk yang tidak kamu ikuti. */}
      <PortalSection id="sudah-lewat" title="Sudah kamu ikuti" link={{ to: '/rekaman', label: 'Semua rekaman' }}>
        {past.length > 0 ? (
          <div className="panel">
            <MyRows
              items={past}
              chips={(m) => [
                ...(youtubeId(m.activity.youtube_url) ? ['rekaman'] : []),
                ...(m.status === 'confirmed' && feedbackOpen(m.activity, new Date(now))
                  ? [feedbackIds.includes(m.activity.id) ? 'feedback ✓' : 'beri feedback']
                  : []),
              ]}
            />
          </div>
        ) : (
          <p className="psec-empty">
            Belum ada sesi yang sudah kamu ikuti.{' '}
            <Link className="text-link" to="/rekaman">
              Tonton rekaman sesi komunitas sebelumnya
            </Link>
            .
          </p>
        )}
      </PortalSection>
    </>
  );
}

function MyRows({ items, chips }: { items: MyActivity[]; chips: (m: MyActivity) => string[] }) {
  return (
    <ul className="rows event-rows">
      {items.map((m) => (
        <li key={m.activity.id}>
          <DateTile activity={m.activity} />
          <div className="row-main">
            <Link className="title" to={myActivityPath(m.activity)}>
              {m.activity.title}
            </Link>
            <span>{m.activity.starts_at ? `${formatWibDate(m.activity.starts_at)}, ${timeRange(m.activity)}` : 'Jadwal menyusul'}</span>
          </div>
          <span className="my-chips">
            {chips(m).map((c) => (
              <span key={c} className={`chip ${c === 'beri feedback' ? 'yellow' : ''}`}>
                {c}
              </span>
            ))}
          </span>
        </li>
      ))}
    </ul>
  );
}

function DateTile({ activity: a }: { activity: Activity }) {
  const parts = a.starts_at ? wibDayParts(a.starts_at) : null;
  return (
    <span className="date-tile" aria-hidden="true">
      {parts ? (
        <>
          <b>{parts.day}</b>
          <span>{parts.month}</span>
        </>
      ) : (
        <span>TBA</span>
      )}
    </span>
  );
}
