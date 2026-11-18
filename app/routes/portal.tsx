import { Link } from 'react-router';
import type { Route } from './+types/portal';
import { EventRows, LoadError, PORTAL_ICONS, PortalPage, PortalSection, type EventRow } from '~/components/Portal';
import {
  activityPath,
  activityStatusLabel,
  canRegister,
  fetchMyRegistrationStatuses,
  getPublishedActivities,
  isPaid,
  registeredPath,
  registerPath,
  upcomingSessions,
  type Activity,
} from '~/lib/activities';
import { displayName, requireUser, useAuth } from '~/lib/auth';
import type { RegistrationStatus } from '~/lib/database.types';
import { formatWibDay, formatWibTime, relativeFromNow, wibDayParts } from '~/lib/format';
import { MY_ACTIVITIES_PATH, myActivityPath } from '~/lib/my-activities';
import { missingProfileParts } from '~/lib/profile';

export const meta: Route.MetaFunction = () => [{ title: 'Portal — SWE Growth' }, { name: 'robots', content: 'noindex' }];

/** Berapa baris agenda di beranda; sisanya di halaman Kegiatan. */
const UPCOMING_LIMIT = 3;

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const user = await requireUser(request);
  // Gagal muat = null, supaya tidak tampil seolah agendanya kosong.
  const [regs, activities] = await Promise.all([
    fetchMyRegistrationStatuses(user.id).catch(() => null),
    getPublishedActivities({ strict: true }).catch(() => null),
  ]);
  if (!regs || !activities) return { failed: true as const };

  const statusById = new Map(regs.map((r) => [r.activity_id, r.status]));
  const upcoming = upcomingSessions(activities, { undatedLast: true }).map((a) => ({ activity: a, status: statusById.get(a.id) ?? null }));
  return { failed: false as const, upcoming };
}

export function HydrateFallback() {
  return <div className="loading-block">Memuat portal…</div>;
}

type Upcoming = { activity: Activity; status: RegistrationStatus | null };

const rowOf = ({ activity, status }: Upcoming): EventRow =>
  status
    ? { activity, tag: status === 'waitlisted' ? 'waitlist' : 'kamu terdaftar', href: myActivityPath(activity), mine: true }
    : { activity, tag: activityStatusLabel[activity.status], href: activityPath(activity) };

export default function Portal({ loaderData }: Route.ComponentProps) {
  const { user, profile } = useAuth();
  const firstName = displayName(profile, user).split(' ')[0];
  const missing = profile ? missingProfileParts(profile) : [];

  if (loaderData.failed) {
    return (
      <PortalPage title={`Halo, ${firstName}`}>
        <LoadError what="Agenda dan kegiatanmu" />
      </PortalPage>
    );
  }

  const { upcoming } = loaderData;
  // Sorotan: sesi terdekat yang kamu ikuti; kalau belum ada, satu sesi yang pendaftarannya dibuka.
  const next = upcoming.find((u) => u.status);
  const featured = next ? null : upcoming.find((u) => u.activity.starts_at && canRegister(u.activity));
  const lead = next ?? featured;
  const rest = upcoming.filter((u) => u !== lead).slice(0, UPCOMING_LIMIT);

  const intro = next
    ? next.status === 'waitlisted'
      ? 'Kamu masuk waitlist untuk sesi berikutnya. Kami kabari kalau ada kursi.'
      : next.activity.starts_at
        ? `Sesi berikutnya kamu ${relativeFromNow(next.activity.starts_at)}.`
        : 'Kamu terdaftar di sesi berikutnya; jadwalnya menyusul.'
    : featured
      ? 'Kamu belum terdaftar di sesi mana pun. Yang ini pendaftarannya sedang dibuka.'
      : upcoming.length > 0
        ? 'Belum ada sesi yang pendaftarannya dibuka. Ini yang akan datang.'
        : 'Belum ada agenda baru. Sambil menunggu, tonton lagi sesi yang sudah lewat.';

  return (
    <PortalPage title={`Halo, ${firstName}`} intro={intro}>
      {lead && <LeadSession item={lead} />}

      {!lead && upcoming.length === 0 && (
        <div className="inline-actions">
          <Link className="btn btn-primary" to="/rekaman">
            Tonton rekaman
          </Link>
        </div>
      )}

      {rest.length > 0 && (
        <PortalSection title={lead ? 'Berikutnya' : 'Akan datang'} link={{ to: MY_ACTIVITIES_PATH, label: 'Semua kegiatan' }}>
          <div className="panel">
            <EventRows items={rest.map(rowOf)} />
          </div>
        </PortalSection>
      )}

      <div className="portal-shortcuts">
        <Link className="shortcut" to="/portal/komunitas">
          <span className="shortcut-ic">{PORTAL_ICONS.community}</span>
          <span className="shortcut-body">
            <strong>Ngobrol di grup komunitas</strong>
            <span>WhatsApp umum, Telegram, dan grup per bidang</span>
          </span>
          <span className="shortcut-go">{PORTAL_ICONS.arrow}</span>
        </Link>
        {missing.length > 0 && (
          <Link className="shortcut" to="/portal/profil/edit">
            <span className="shortcut-ic">{PORTAL_ICONS.profile}</span>
            <span className="shortcut-body">
              <strong>Lengkapi profilmu</strong>
              <span>Belum ada: {missing.join(', ')}</span>
            </span>
            <span className="shortcut-go">{PORTAL_ICONS.arrow}</span>
          </Link>
        )}
      </div>
    </PortalPage>
  );
}

/** Kartu teal: satu-satunya hal yang paling penting di beranda. */
function LeadSession({ item: { activity: a, status } }: { item: Upcoming }) {
  const parts = a.starts_at ? wibDayParts(a.starts_at) : null;
  const registerable = !status && canRegister(a) && !isPaid(a);
  return (
    <article className="lead-session on-teal" aria-labelledby="sesi-utama">
      <div className="lead-date" aria-hidden="true">
        {parts ? (
          <>
            <b>{parts.day}</b>
            <span>{parts.month}</span>
          </>
        ) : (
          <span>TBA</span>
        )}
      </div>
      <div className="lead-body">
        <h2 id="sesi-utama">{a.title}</h2>
        <p className="lead-meta">
          {[a.starts_at && formatWibDay(a.starts_at), a.starts_at && formatWibTime(a.starts_at), a.mode].filter(Boolean).join(' · ') ||
            'Jadwal menyusul'}
        </p>
        {status === 'waitlisted' && <p className="lead-note">Status: waitlist</p>}
        <div className="inline-actions lead-actions">
          {status ? (
            <Link className="btn btn-primary" to={registeredPath(a)}>
              Tiket & link meeting
            </Link>
          ) : registerable ? (
            <Link className="btn btn-primary" to={registerPath(a)}>
              {a.status === 'full' ? 'Masuk waitlist' : 'Daftar'}
            </Link>
          ) : null}
          <Link className={`btn ${status || registerable ? 'btn-ghost' : 'btn-primary'}`} to={activityPath(a)}>
            Detail acara
          </Link>
        </div>
      </div>
    </article>
  );
}
