import { useState, type FormEvent } from 'react';
import { Link, redirect } from 'react-router';
import type { Route } from './+types/job-manage';
import { Field, useMutation, val } from '~/lib/admin-form';
import { requireUser, useAuth } from '~/lib/auth';
import type { JobRejectReason, JobRow, JobStatus } from '~/lib/database.types';
import { formatDate } from '~/lib/format';
import {
  applyLabel,
  deleteJob,
  fetchIsJobPoster,
  formatDeadline,
  JOB_SUBMIT_PATH,
  JOBS_PATH,
  jobMeta,
  loadJobManager,
  normalizeApplyUrl,
  RELATION_LABEL,
  REJECT_REASONS,
  rejectReasonLabel,
  STATUS_LABEL,
  updateJob,
} from '~/lib/jobs';

export const meta: Route.MetaFunction = () => [{ title: 'Kelola loker — SWE Growth' }, { name: 'robots', content: 'noindex' }];

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  await requireUser(request);
  if (!(await fetchIsJobPoster())) throw redirect(JOBS_PATH);
  return loadJobManager();
}

export function HydrateFallback() {
  return <div className="loading-block">Memuat…</div>;
}

const VIEWS: { id: JobStatus; label: string }[] = [
  { id: 'pending', label: 'Menunggu' },
  { id: 'approved', label: 'Tayang' },
  { id: 'hidden', label: 'Disembunyikan' },
  { id: 'rejected', label: 'Ditolak' },
];

/**
 * Tim loker & admin: review rekomendasi member, sembunyikan loker yang sudah
 * tutup, dan hapus. Loker baru ditambahkan lewat form kirim (langsung tayang).
 */
export default function JobManage({ loaderData: { jobs, submitters } }: Route.ComponentProps) {
  const { user } = useAuth();
  const { busy, run, flash } = useMutation();
  const [view, setView] = useState<JobStatus>('pending');
  const [rejecting, setRejecting] = useState<string | null>(null);

  const submitterOf = new Map(submitters.map((p) => [p.id, p]));
  const countOf = (s: JobStatus) => jobs.filter((j) => j.status === s).length;
  const shown = jobs.filter((j) => j.status === view);
  const duplicateOf = (j: JobRow) =>
    jobs.find((o) => o.id !== j.id && o.status !== 'rejected' && normalizeApplyUrl(o.apply_url) === normalizeApplyUrl(j.apply_url));

  const reviewed = () => ({ reviewed_by: user?.id ?? null, reviewed_at: new Date().toISOString() });

  const setStatus = (j: JobRow, status: JobStatus, message: string) =>
    run(
      () =>
        updateJob(j.id, {
          status,
          ...(status === 'approved' || status === 'rejected' ? reviewed() : {}),
          ...(status !== 'rejected' ? { reject_reason: null, reject_note: '' } : {}),
        }),
      message,
    );

  const reject = async (e: FormEvent<HTMLFormElement>, j: JobRow) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const ok = await run(
      () =>
        updateJob(j.id, {
          status: 'rejected',
          reject_reason: val(form, 'reject_reason') as JobRejectReason,
          reject_note: val(form, 'reject_note'),
          ...reviewed(),
        }),
      `"${j.title}" ditolak. Pengirim melihat alasannya di portal.`,
    );
    if (ok) setRejecting(null);
  };

  const remove = (j: JobRow) => {
    if (!confirm(`Hapus "${j.title}" permanen?`)) return;
    void run(() => deleteJob(j.id), 'Loker dihapus.');
  };

  return (
    <section className="block">
      <div className="wrap narrow-wrap">
        <Link className="back" to={JOBS_PATH}>
          ← Loker
        </Link>
        <div className="rec-head">
          <div>
            <h1 className="page-title">Kelola loker</h1>
            <p className="muted">Review rekomendasi member dan rapikan direktori. Loker yang kamu tambahkan langsung tayang.</p>
          </div>
          <Link className="btn btn-primary" to={JOB_SUBMIT_PATH}>
            Tambah loker
          </Link>
        </div>

        <div className="panel">
          <nav className="member-tabs rec-admin-tabs" aria-label="Status loker">
            {VIEWS.map((v) => (
              <a
                key={v.id}
                href={`#${v.id}`}
                aria-current={view === v.id ? 'page' : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  setView(v.id);
                }}
              >
                {v.label} ({countOf(v.id)})
              </a>
            ))}
          </nav>
          {flash}

          {shown.length === 0 ? (
            <p className="form-sub mt-16">
              {view === 'pending'
                ? 'Antrean kosong. Semua rekomendasi sudah diproses.'
                : `Belum ada loker berstatus "${STATUS_LABEL[view].toLowerCase()}".`}
            </p>
          ) : (
            <ul className="admin-list">
              {shown.map((j) => {
                const by = j.submitted_by ? submitterOf.get(j.submitted_by) : null;
                const dup = duplicateOf(j);
                const mine = j.submitted_by === user?.id;
                return (
                  <li key={j.id}>
                    <div className="rec-admin-item">
                      <div>
                        <strong>
                          {j.title} · {j.company}
                        </strong>
                        <span className="slug">
                          {[...jobMeta(j), j.deadline && `tutup ${formatDeadline(j.deadline)}`].filter(Boolean).join(' · ')}
                        </span>
                        <a className="slug" href={j.apply_url} target="_blank" rel="noopener nofollow">
                          {applyLabel(j.apply_url)}
                        </a>
                        <p className="rec-admin-reason">{j.description}</p>
                        <span className="slug">
                          {j.source === 'poster' ? 'Ditambahkan tim loker' : 'Direkomendasikan'}{' '}
                          {by ? <Link to={`/member/${by.handle}`}>{by.full_name || 'member'}</Link> : '(akun dihapus)'}
                          {` · ${RELATION_LABEL[j.submitter_relation].form.toLowerCase()}`}
                          {j.open_to_questions && ' · bisa ditanya'}
                          {!j.show_submitter && ' · nama disembunyikan'}
                          {` · ${formatDate(j.created_at)}`}
                        </span>
                        {j.status === 'rejected' && (
                          <span className="slug">
                            Alasan: {rejectReasonLabel(j.reject_reason)}
                            {j.reject_note && ` — ${j.reject_note}`}
                          </span>
                        )}
                        {dup && (
                          <p className="form-message error">
                            Link sama dengan "{dup.title}" ({STATUS_LABEL[dup.status].toLowerCase()}).
                          </p>
                        )}
                      </div>

                      <div className="inline-actions">
                        {j.status === 'pending' && (
                          <>
                            <button
                              className="btn btn-primary sm"
                              type="button"
                              disabled={busy}
                              onClick={() => setStatus(j, 'approved', `"${j.title}" disetujui dan tayang.`)}
                            >
                              Setujui
                            </button>
                            <button
                              className="link-btn"
                              type="button"
                              disabled={busy}
                              onClick={() => setRejecting(rejecting === j.id ? null : j.id)}
                            >
                              Tolak
                            </button>
                          </>
                        )}
                        {j.status === 'approved' && (
                          <>
                            {mine && (
                              <Link className="link-btn" to={`${JOB_SUBMIT_PATH}?edit=${j.id}`}>
                                Edit
                              </Link>
                            )}
                            <button
                              className="btn btn-ghost sm"
                              type="button"
                              disabled={busy}
                              onClick={() => setStatus(j, 'hidden', `"${j.title}" disembunyikan dari direktori.`)}
                            >
                              Sembunyikan
                            </button>
                          </>
                        )}
                        {(j.status === 'hidden' || j.status === 'rejected') && (
                          <>
                            <button
                              className="btn btn-ghost sm"
                              type="button"
                              disabled={busy || (j.status === 'rejected' && Boolean(dup))}
                              onClick={() => setStatus(j, 'approved', `"${j.title}" tayang.`)}
                            >
                              {j.status === 'hidden' ? 'Tayangkan lagi' : 'Setujui'}
                            </button>
                            <button className="link-btn" type="button" disabled={busy} onClick={() => remove(j)}>
                              Hapus
                            </button>
                          </>
                        )}
                      </div>

                      {rejecting === j.id && (
                        <form className="rec-reject" onSubmit={(e) => reject(e, j)}>
                          <Field id={`jr_${j.id}`} label="Alasan">
                            <select id={`jr_${j.id}`} name="reject_reason" required defaultValue={dup ? 'duplikat' : ''}>
                              <option value="" disabled>
                                Pilih alasan
                              </option>
                              {REJECT_REASONS.map((x) => (
                                <option key={x.id} value={x.id}>
                                  {x.label}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field id={`jn_${j.id}`} label="Catatan untuk pengirim" optional>
                            <input id={`jn_${j.id}`} name="reject_note" maxLength={300} />
                          </Field>
                          <div className="inline-actions">
                            <button className="btn btn-primary sm" type="submit" disabled={busy}>
                              Tolak rekomendasi
                            </button>
                            <button className="link-btn" type="button" onClick={() => setRejecting(null)}>
                              Batal
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
