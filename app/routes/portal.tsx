import { useState } from 'react';
import { Link, useRevalidator } from 'react-router';
import type { Route } from './+types/portal';
import { CommunityChannels } from '~/components/CommunityChannels';
import { PastEventList } from '~/components/PastEventList';
import { PortalHeader } from '~/components/PortalHeader';
import {
  activityPath,
  activityStatusLabel,
  pastActivities,
  registeredPath,
  upcomingSessions,
  type Activity,
  fetchMyRegistrationStatuses,
  getPublishedActivities,
} from '~/lib/activities';
import { requireUser } from '~/lib/auth';
import { fetchWhatsappGroups } from '~/lib/community';
import type { JobRow, RecommendationRow, RegistrationStatus } from '~/lib/database.types';
import {
  fetchMyJobs,
  JOB_SUBMIT_PATH,
  JOBS_PATH,
  rejectReasonLabel as jobRejectReasonLabel,
  STATUS_LABEL as JOB_STATUS_LABEL,
  withdrawJob,
} from '~/lib/jobs';
import { formatWibTime, relativeFromNow, wibDayParts } from '~/lib/format';
import {
  categoryOf,
  directoryPath,
  fetchMyRecommendations,
  rejectReasonLabel,
  STATUS_LABEL,
  SUBMIT_PATH,
  withdrawRecommendation,
} from '~/lib/recommendations';

export const meta: Route.MetaFunction = () => [{ title: 'Portal — SWE Growth' }, { name: 'robots', content: 'noindex' }];

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const user = await requireUser(request);
  const [regs, activities, groups, recommendations, jobs] = await Promise.all([
    fetchMyRegistrationStatuses(user.id),
    getPublishedActivities(),
    fetchWhatsappGroups(),
    fetchMyRecommendations(user.id),
    fetchMyJobs(user.id),
  ]);

  const upcoming = upcomingSessions(activities, { undatedLast: true });
  const statusById = new Map(regs.map((r) => [r.activity_id, r.status]));
  const attended = new Set(regs.filter((r) => r.status === 'confirmed').map((r) => r.activity_id));

  return {
    mine: upcoming.filter((a) => statusById.has(a.id)).map((a) => ({ activity: a, status: statusById.get(a.id)! })),
    others: upcoming.filter((a) => !statusById.has(a.id)),
    past: pastActivities(activities).slice(0, PAST_LIMIT),
    attended: [...attended],
    groups,
    recommendations,
    jobs,
  };
}

const PAST_LIMIT = 5;

export function HydrateFallback() {
  return <div className="loading-block">Memuat portal…</div>;
}

const registrationLabel: Record<RegistrationStatus, string> = {
  confirmed: 'terdaftar',
  waitlisted: 'waitlist',
  cancelled: 'batal',
};

export default function Portal({ loaderData }: Route.ComponentProps) {
  const { mine, others, past, attended, groups, recommendations, jobs } = loaderData;
  const empty = mine.length === 0 && others.length === 0;

  return (
    <>
      <PortalHeader />
      <section className="block tight-top">
        <div className="wrap narrow-wrap portal-stack">
          {empty && <p className="muted">Belum ada agenda. Saat admin menambahkannya, semuanya muncul di halaman ini.</p>}

          {mine.length > 0 && (
            <div className="panel">
              <div className="panel-head">
                <h2>Kegiatan yang kamu ikuti</h2>
              </div>
              <EventRows
                items={mine.map((m) => ({ activity: m.activity, tag: registrationLabel[m.status], href: registeredPath(m.activity) }))}
              />
            </div>
          )}

          {others.length > 0 && (
            <div className="panel">
              <div className="panel-head">
                <h2>Agenda</h2>
              </div>
              <EventRows items={others.map((a) => ({ activity: a, tag: activityStatusLabel[a.status], href: activityPath(a) }))} />
            </div>
          )}

          {past.length > 0 && (
            <div className="panel">
              <div className="panel-head">
                <h2>Kegiatan lalu</h2>
                <Link to="/agenda?waktu=lalu">Lihat semua</Link>
              </div>
              <PastEventList activities={past} tagOf={(a) => (attended.includes(a.id) ? 'kamu ikut' : null)} />
            </div>
          )}

          <div className="panel">
            <div className="panel-head">
              <h2>Gabung komunitas</h2>
            </div>
            <CommunityChannels />
          </div>

          {groups.length > 0 && (
            <div className="panel">
              <div className="panel-head">
                <h2>Grup per bidang</h2>
              </div>
              <ul className="rows">
                {groups.map((g) => (
                  <li key={g.id}>
                    <div className="row-main">
                      <strong>{g.name}</strong>
                      {g.description && <span>{g.description}</span>}
                    </div>
                    <a className="btn btn-ghost sm" href={g.invite_url} target="_blank" rel="noopener">
                      Gabung
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <MyRecommendations items={recommendations} />
          <MyJobs items={jobs} />
        </div>
      </section>
    </>
  );
}

function EventRows({ items }: { items: { activity: Activity; tag: string; href: string }[] }) {
  return (
    <ul className="rows event-rows">
      {items.map(({ activity: a, tag, href }) => {
        const parts = a.starts_at ? wibDayParts(a.starts_at) : null;
        return (
          <li key={a.id}>
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
              <Link className="title" to={href}>
                {a.title}
              </Link>
              <span>
                {[a.starts_at && `${relativeFromNow(a.starts_at)} · ${formatWibTime(a.starts_at)}`, a.mode].filter(Boolean).join(' · ') ||
                  'Jadwal menyusul'}
              </span>
            </div>
            <span className="chip">{tag}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** Usulan rekomendasi milik member: status review, edit/tarik selama masih menunggu. */
function MyRecommendations({ items }: { items: RecommendationRow[] }) {
  const revalidator = useRevalidator();
  const [busy, setBusy] = useState<string | null>(null);

  const withdraw = async (r: RecommendationRow) => {
    if (!confirm(`Tarik rekomendasi "${r.title}"? Usulannya dihapus dari antrean review.`)) return;
    setBusy(r.id);
    await withdrawRecommendation(r.id);
    setBusy(null);
    await revalidator.revalidate();
  };

  return (
    <div className="panel" id="rekomendasiku">
      <div className="panel-head">
        <h2>Rekomendasiku</h2>
        <Link to={SUBMIT_PATH}>Kirim rekomendasi</Link>
      </div>
      {items.length === 0 ? (
        <p className="form-sub">
          Tahu acara, komunitas, course, atau buku yang bikin kamu grow?{' '}
          <Link className="text-link" to={SUBMIT_PATH}>
            Rekomendasikan ke member lain
          </Link>
          .
        </p>
      ) : (
        <ul className="rows">
          {items.map((r) => (
            <li key={r.id}>
              <div className="row-main">
                <strong>{r.title}</strong>
                <span>
                  {categoryOf(r.category).label}
                  {r.status === 'rejected' && rejectReasonLabel(r.reject_reason) && ` · ${rejectReasonLabel(r.reject_reason)}`}
                  {r.status === 'rejected' && r.reject_note && ` · ${r.reject_note}`}
                </span>
                {r.status === 'pending' && (
                  <span className="inline-actions rec-row-actions">
                    <Link className="text-link" to={`${SUBMIT_PATH}?edit=${r.id}`}>
                      Edit
                    </Link>
                    <button className="link-btn" type="button" disabled={busy === r.id} onClick={() => withdraw(r)}>
                      Tarik
                    </button>
                  </span>
                )}
                {r.status === 'approved' && (
                  <span>
                    <Link className="text-link" to={directoryPath(r.category)}>
                      Lihat di direktori
                    </Link>
                  </span>
                )}
              </div>
              <span className={`chip rec-status ${r.status}`}>{STATUS_LABEL[r.status]}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Loker yang dikirim member: status review, edit/tarik selama masih menunggu. */
function MyJobs({ items }: { items: JobRow[] }) {
  const revalidator = useRevalidator();
  const [busy, setBusy] = useState<string | null>(null);

  const withdraw = async (j: JobRow) => {
    if (!confirm(`Tarik loker "${j.title}"? Kirimannya dihapus dari antrean review.`)) return;
    setBusy(j.id);
    await withdrawJob(j.id);
    setBusy(null);
    await revalidator.revalidate();
  };

  return (
    <div className="panel" id="lokerku">
      <div className="panel-head">
        <h2>Lokerku</h2>
        <Link to={JOB_SUBMIT_PATH}>Rekomendasikan loker</Link>
      </div>
      {items.length === 0 ? (
        <p className="form-sub">
          Lihat loker bagus di grup atau di kantormu?{' '}
          <Link className="text-link" to={JOB_SUBMIT_PATH}>
            Bagikan ke direktori loker
          </Link>
          .
        </p>
      ) : (
        <ul className="rows">
          {items.map((j) => (
            <li key={j.id}>
              <div className="row-main">
                <strong>{j.title}</strong>
                <span>
                  {j.company}
                  {j.status === 'rejected' && jobRejectReasonLabel(j.reject_reason) && ` · ${jobRejectReasonLabel(j.reject_reason)}`}
                  {j.status === 'rejected' && j.reject_note && ` · ${j.reject_note}`}
                </span>
                {j.status === 'pending' && (
                  <span className="inline-actions rec-row-actions">
                    <Link className="text-link" to={`${JOB_SUBMIT_PATH}?edit=${j.id}`}>
                      Edit
                    </Link>
                    <button className="link-btn" type="button" disabled={busy === j.id} onClick={() => withdraw(j)}>
                      Tarik
                    </button>
                  </span>
                )}
                {j.status === 'approved' && (
                  <span>
                    <Link className="text-link" to={JOBS_PATH}>
                      Lihat di direktori
                    </Link>
                  </span>
                )}
              </div>
              <span className={`chip rec-status ${j.status}`}>{JOB_STATUS_LABEL[j.status]}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
