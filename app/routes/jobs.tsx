import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { Route } from './+types/jobs';
import { JobCard } from '~/components/JobCard';
import { useAuth } from '~/lib/auth';
import type { JobLevel, JobWorkMode } from '~/lib/database.types';
import {
  EMPLOYMENT_LABEL,
  fetchIsJobPoster,
  getPublishedJobs,
  isEmploymentType,
  JOB_MANAGE_PATH,
  JOB_SUBMIT_PATH,
  LEVEL_LABEL,
  WORK_MODE_LABEL,
} from '~/lib/jobs';
import { pageMeta } from '~/lib/site';

export const meta: Route.MetaFunction = () =>
  pageMeta('Loker — SWE Growth', 'Lowongan kerja software engineer dari grup loker SWE Growth dan rekomendasi member.');

/** Saat build: snapshot untuk HTML prerender. */
export async function loader() {
  return { items: await getPublishedJobs() };
}

/** Di browser: selalu ambil yang terbaru. */
export async function clientLoader() {
  return { items: await getPublishedJobs() };
}
clientLoader.hydrate = true as const;

/** Filter disimpan di URL supaya hasil filter bisa dibagikan. */
export default function Jobs({ loaderData: { items } }: Route.ComponentProps) {
  const [params, setParams] = useSearchParams();
  const type = params.get('tipe');
  const mode = params.get('mode') ?? '';
  const level = params.get('level') ?? '';
  const query = params.get('q') ?? '';
  const isPoster = useIsJobPoster();

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
      (!q || [j.title, j.company, j.location, j.description].some((v) => v.toLowerCase().includes(q))),
  );
  const shown = isEmploymentType(type) ? base.filter((j) => j.employment_type === type) : base;
  const types = (Object.keys(EMPLOYMENT_LABEL) as (keyof typeof EMPLOYMENT_LABEL)[]).filter((t) =>
    items.some((j) => j.employment_type === t),
  );
  const filtered = Boolean(mode || level || q || isEmploymentType(type));

  return (
    <section className="block">
      <div className="wrap narrow-wrap">
        <div className="rec-head">
          <div>
            <h1 className="page-title">Loker</h1>
            <p className="muted">
              Lowongan dari grup loker SWE Growth dan rekomendasi member. Lamar langsung lewat link aslinya, dan hati-hati dengan loker yang
              minta bayaran.
            </p>
          </div>
          <div className="inline-actions">
            {isPoster && (
              <Link className="btn btn-ghost" to={JOB_MANAGE_PATH}>
                Kelola
              </Link>
            )}
            <Link className="btn btn-primary" to={JOB_SUBMIT_PATH}>
              {isPoster ? 'Tambah loker' : 'Rekomendasikan loker'}
            </Link>
          </div>
        </div>

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
              <JobCard key={j.id} j={j} />
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
      </div>
    </section>
  );
}

/** Halaman di-prerender, jadi peran tim loker baru dicek setelah sesi terbaca di browser. */
function useIsJobPoster() {
  const { user, isAdmin } = useAuth();
  const [isPoster, setIsPoster] = useState(false);
  const userId = user?.id;
  useEffect(() => {
    if (!userId || isAdmin) return;
    let cancelled = false;
    void fetchIsJobPoster().then((v) => {
      if (!cancelled) setIsPoster(v);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, isAdmin]);
  return Boolean(userId) && (isAdmin || isPoster);
}
