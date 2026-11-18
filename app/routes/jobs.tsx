import { useRef, useState } from 'react';
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
import { skipSearchOnlyRevalidation } from '~/lib/revalidate';

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

export const shouldRevalidate = skipSearchOnlyRevalidation;

export function HydrateFallback() {
  return <div className="loading-block">Memuat loker…</div>;
}

/** Filter disimpan di URL supaya hasil filter bisa dibagikan ke sesama member. */
export default function Jobs({ loaderData: { items, isPoster, canInterest } }: Route.ComponentProps) {
  return (
    <PortalPage
      className="job-board"
      title="Loker"
      intro="Dari grup loker dan member. Waspadai lowongan yang meminta bayaran."
      actions={
        <>
          {isPoster && (
            <Link className="btn btn-ghost sm" to={JOB_MANAGE_PATH}>
              Kelola
            </Link>
          )}
          <Link className="btn btn-primary sm" to={JOB_SUBMIT_PATH}>
            {isPoster ? 'Tambah loker' : 'Bagikan loker'}
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
  const activeFilters = [mode, level].filter(Boolean).length;
  // Di HP filter mode & level dilipat supaya daftar loker langsung terlihat.
  const [filterOpen, setFilterOpen] = useState(activeFilters > 0);
  const searchRef = useRef<HTMLInputElement>(null);

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

  const resetFilters = () => {
    setParams(new URLSearchParams(), { replace: true, preventScrollReset: true });
    // Kolom cari tidak terkendali (defaultValue), jadi dikosongkan langsung.
    if (searchRef.current) searchRef.current.value = '';
  };

  return (
    <>
      <div className="job-search">
        <input
          ref={searchRef}
          type="search"
          aria-label="Cari loker"
          placeholder="Cari posisi, perusahaan, kota…"
          defaultValue={query}
          onChange={(e) => set('q', e.target.value)}
        />
        <button
          className="job-filter-toggle"
          type="button"
          aria-expanded={filterOpen}
          aria-controls="job-filters"
          onClick={() => setFilterOpen((o) => !o)}
        >
          Filter{activeFilters > 0 && <span>{activeFilters}</span>}
        </button>
      </div>

      <div id="job-filters" className={`job-filters${filterOpen ? ' is-open' : ''}`}>
        <select aria-label="Mode kerja" value={mode} onChange={(e) => set('mode', e.target.value)}>
          <option value="">Semua mode</option>
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

      <nav className="rec-tabs job-types" aria-label="Tipe pekerjaan">
        <button type="button" aria-pressed={!isEmploymentType(type)} onClick={() => set('tipe', '')}>
          Semua <span>{base.length}</span>
        </button>
        {types.map((t) => (
          <button key={t} type="button" aria-pressed={type === t} onClick={() => set('tipe', t)}>
            {EMPLOYMENT_LABEL[t]} <span>{base.filter((j) => j.employment_type === t).length}</span>
          </button>
        ))}
      </nav>

      {!canInterest && (
        <p className="job-profile-note">
          <Link to="/portal/profil/edit">Lengkapi profil Anda</Link> untuk dapat menandai tertarik.
        </p>
      )}

      {shown.length > 0 ? (
        <>
          <h2 className="job-list-title">{filtered ? `${shown.length} lowongan cocok` : 'Lowongan terbaru dari grup'}</h2>
          <ul className="job-list">
            {shown.map((j) => (
              <JobCard key={j.id} j={j} canInterest={canInterest} />
            ))}
          </ul>
        </>
      ) : (
        <div className="empty-note rec-empty">
          <p>{filtered ? 'Tidak ada lowongan untuk filter ini.' : 'Belum ada lowongan yang dibuka.'}</p>
          {filtered ? (
            <button className="btn btn-primary" type="button" onClick={resetFilters}>
              Hapus filter
            </button>
          ) : (
            <Link className="btn btn-primary" to={JOB_SUBMIT_PATH}>
              Bagikan lowongan
            </Link>
          )}
        </div>
      )}
      {/* Jumlah hasil untuk pembaca layar; judul daftar berubah tanpa diumumkan. */}
      <p className="visually-hidden" role="status">
        {filtered ? `${shown.length} lowongan cocok dengan filter.` : ''}
      </p>
    </>
  );
}
