import { Link, useSearchParams } from 'react-router';
import type { Route } from './+types/jobs';
import { JobCard } from '~/components/JobCard';
import { LoadError, PortalPage } from '~/components/Portal';
import { requireUser } from '~/lib/auth';
import type { JobLevel, JobWorkMode } from '~/lib/database.types';
import {
  EMPLOYMENT_LABEL,
  fetchHasCompleteProfile,
  fetchIsJobPoster,
  getPublishedJobs,
  isEmploymentType,
  JOB_MANAGE_PATH,
  JOB_SUBMIT_PATH,
  LEVEL_LABEL,
  WORK_MODE_LABEL,
  type Job,
} from '~/lib/jobs';

export const meta: Route.MetaFunction = () => [{ title: 'Loker — SWE Growth' }, { name: 'robots', content: 'noindex' }];

/** Portal internal: hanya member yang login. */
export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  await requireUser(request);
  const [items, isPoster, canInterest] = await Promise.all([
    // null = gagal dimuat, beda dengan belum ada loker.
    getPublishedJobs().catch(() => null),
    fetchIsJobPoster(),
    fetchHasCompleteProfile(),
  ]);
  return { items, isPoster, canInterest };
}

export function HydrateFallback() {
  return <div className="loading-block">Memuat loker…</div>;
}

/** Filter disimpan di URL supaya hasil filter bisa dibagikan ke sesama member. */
export default function Jobs({ loaderData: { items, isPoster, canInterest } }: Route.ComponentProps) {
  return (
    <PortalPage
      title="Loker"
      intro="Lowongan dari grup loker dan rekomendasi member. Klik Tertarik supaya pemilik lokernya bisa melihat profilmu, dan hati-hati dengan loker yang minta bayaran."
      actions={
        <>
          {isPoster && (
            <Link className="btn btn-ghost" to={JOB_MANAGE_PATH}>
              Kelola
            </Link>
          )}
          <Link className="btn btn-primary" to={JOB_SUBMIT_PATH}>
            {isPoster ? 'Tambah loker' : 'Rekomendasikan loker'}
          </Link>
        </>
      }
    >
      {items === null ? <LoadError what="Daftar loker" /> : <JobDirectory items={items} canInterest={canInterest} />}
    </PortalPage>
  );
}

function JobDirectory({ items, canInterest }: { items: Job[]; canInterest: boolean }) {
  const [params, setParams] = useSearchParams();
  const type = params.get('tipe');
  const mode = params.get('mode') ?? '';
  const level = params.get('level') ?? '';
  const query = params.get('q') ?? '';

  const set = (key: string, value: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true, preventScrollReset: true },
    );

  const q = query.trim().toLowerCase();
  // Filter selain tipe dulu, supaya jumlah per tipe ikut filter lain.
  const base = items.filter(
    (j) =>
      (!mode || j.work_mode === mode) &&
      (!level || j.level === level) &&
      (!q || [j.title, j.company, j.location, j.description, j.original_message].some((v) => v.toLowerCase().includes(q))),
  );
  const shown = isEmploymentType(type) ? base.filter((j) => j.employment_type === type) : base;
  const types = (Object.keys(EMPLOYMENT_LABEL) as (keyof typeof EMPLOYMENT_LABEL)[]).filter((t) =>
    items.some((j) => j.employment_type === t),
  );
  const filtered = Boolean(mode || level || q || isEmploymentType(type));

  return (
    <>
      {!canInterest && (
        <p className="job-profile-note">
          Lengkapi <Link to="/portal/profil/edit">profilmu</Link> supaya bisa menandai Tertarik. Pemilik loker melihat profil, WhatsApp, dan
          LinkedIn-mu dari situ.
        </p>
      )}

      <nav className="rec-tabs" aria-label="Tipe pekerjaan">
        <button type="button" aria-pressed={!isEmploymentType(type)} onClick={() => set('tipe', '')}>
          Semua <span>{base.length}</span>
        </button>
        {types.map((t) => (
          <button key={t} type="button" aria-pressed={type === t} onClick={() => set('tipe', t)}>
            {EMPLOYMENT_LABEL[t]} <span>{base.filter((j) => j.employment_type === t).length}</span>
          </button>
        ))}
      </nav>

      <div className="rec-filters">
        <input
          type="search"
          aria-label="Cari loker"
          placeholder="Cari posisi, perusahaan, atau kota…"
          defaultValue={query}
          onChange={(e) => set('q', e.target.value)}
        />
        <select aria-label="Mode kerja" value={mode} onChange={(e) => set('mode', e.target.value)}>
          <option value="">Semua mode kerja</option>
          {(Object.keys(WORK_MODE_LABEL) as JobWorkMode[]).map((m) => (
            <option key={m} value={m}>
              {WORK_MODE_LABEL[m]}
            </option>
          ))}
        </select>
        <select aria-label="Level" value={level} onChange={(e) => set('level', e.target.value)}>
          <option value="">Semua level</option>
          {(Object.keys(LEVEL_LABEL) as JobLevel[]).map((l) => (
            <option key={l} value={l}>
              {LEVEL_LABEL[l]}
            </option>
          ))}
        </select>
      </div>

      {shown.length > 0 ? (
        <ul className="rec-grid start">
          {shown.map((j) => (
            <JobCard key={j.id} j={j} canInterest={canInterest} />
          ))}
        </ul>
      ) : (
        <div className="empty-note rec-empty">
          <p>{filtered ? 'Belum ada loker buat filter ini.' : 'Belum ada loker yang buka.'} Lihat loker bagus di grup?</p>
          <Link className="btn btn-primary" to={JOB_SUBMIT_PATH}>
            Rekomendasikan ke sini
          </Link>
        </div>
      )}
    </>
  );
}
