import type { FormEvent } from 'react';
import { Link } from 'react-router';
import { addJobPoster, removeJobPoster } from '~/lib/admin-data';
import { useMutation, val } from '~/lib/admin-form';
import { useAuth } from '~/lib/auth';
import type { JobPosterRow, ProfileRow } from '~/lib/database.types';
import { formatDate } from '~/lib/format';
import { JOB_MANAGE_PATH } from '~/lib/jobs';

/**
 * Tab "Loker" di /admin: atur siapa saja tim loker (pengurus grup loker).
 * Kiriman tim loker langsung tayang dan mereka bisa mereview rekomendasi member
 * di /loker/kelola. Admin selalu termasuk tim loker.
 */
export function JobPostersAdmin({
  posters,
  profiles,
  pendingJobs,
}: {
  posters: JobPosterRow[];
  profiles: ProfileRow[];
  pendingJobs: number;
}) {
  const { user } = useAuth();
  const { busy, run, flash } = useMutation();
  const profileOf = new Map(profiles.map((p) => [p.id, p]));
  const posterIds = new Set(posters.map((p) => p.user_id));
  const candidates = profiles.filter((p) => p.full_name && !posterIds.has(p.id)).sort((a, b) => a.full_name.localeCompare(b.full_name));

  const add = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    const userId = val(new FormData(formEl), 'user_id');
    const name = profileOf.get(userId)?.full_name ?? 'Member';
    const ok = await run(() => addJobPoster({ user_id: userId, added_by: user?.id ?? null }), `${name} masuk tim loker.`);
    if (ok) formEl.reset();
  };

  const remove = (p: JobPosterRow) => {
    const name = profileOf.get(p.user_id)?.full_name ?? 'member ini';
    if (!confirm(`Keluarkan ${name} dari tim loker? Loker yang sudah dia tayangkan tetap ada.`)) return;
    void run(() => removeJobPoster(p.user_id), `${name} keluar dari tim loker.`);
  };

  return (
    <div className="admin-grid">
      <form className="form-card" onSubmit={add}>
        <h2>Tim loker</h2>
        <p className="form-sub">
          Pengurus grup loker. Loker yang mereka masukkan langsung tayang di <Link to="/loker">/loker</Link>, dan mereka mereview
          rekomendasi member. Admin otomatis termasuk.
        </p>
        {flash}
        <div className="inline-actions">
          <select name="user_id" aria-label="Member" required defaultValue="">
            <option value="" disabled>
              Pilih member
            </option>
            {candidates.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
                {p.email ? ` (${p.email})` : ''}
              </option>
            ))}
          </select>
          <button className="btn btn-primary sm" type="submit" disabled={busy}>
            Tambahkan
          </button>
        </div>
      </form>

      <div className="panel">
        <div className="panel-head">
          <h2>Anggota ({posters.length})</h2>
          <Link to={JOB_MANAGE_PATH}>Kelola loker{pendingJobs > 0 && ` · ${pendingJobs} menunggu`}</Link>
        </div>
        {posters.length === 0 ? (
          <p className="form-sub">Belum ada. Untuk sementara hanya admin yang bisa menayangkan loker.</p>
        ) : (
          <ul className="admin-list">
            {posters.map((p) => {
              const profile = profileOf.get(p.user_id);
              return (
                <li key={p.user_id}>
                  <div className="inline-actions">
                    <div className="row-main">
                      <Link to={`/admin/member/${p.user_id}`}>{profile?.full_name || profile?.email || 'Member'}</Link>
                      <span className="slug">Sejak {formatDate(p.created_at)}</span>
                    </div>
                    <button className="link-btn" type="button" disabled={busy} onClick={() => remove(p)}>
                      Keluarkan
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
