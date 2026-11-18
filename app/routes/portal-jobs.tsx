import { useRef, useState } from 'react';
import { Link, useLocation, useRevalidator } from 'react-router';
import type { Route } from './+types/portal-jobs';
import { JobInterested } from '~/components/JobInterested';
import { LoadError, PortalPage } from '~/components/Portal';
import { requireUser } from '~/lib/auth';
import type { JobRow } from '~/lib/database.types';
import {
  closeJob,
  companyLabel,
  fetchInterestCounts,
  fetchMyJobs,
  JOB_SUBMIT_PATH as SUBMIT_PATH,
  JOBS_PATH,
  RELATION_LABEL,
  rejectReasonLabel,
  STATUS_LABEL,
  withdrawJob,
} from '~/lib/jobs';

export const meta: Route.MetaFunction = () => [{ title: 'Lokerku — SWE Growth' }, { name: 'robots', content: 'noindex' }];

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const user = await requireUser(request);
  // null = gagal dimuat, beda dengan belum pernah mengirim.
  const [items, counts] = await Promise.all([fetchMyJobs(user.id).catch(() => null), fetchInterestCounts()]);
  return { items, counts, userId: user.id };
}

export function HydrateFallback() {
  return <div className="loading-block">Memuat lowongan Anda…</div>;
}

const WITHDRAW_ERROR = {
  locked: 'Lowongan ini sudah ditinjau sehingga tidak dapat ditarik.',
  failed: 'Gagal menarik lowongan. Periksa koneksi, lalu coba lagi.',
} as const;

/** Diturunkan oleh yang membagikan lewat close_job(): disembunyikan dengan alasan kedaluwarsa. */
const isClosed = (r: JobRow) => r.status === 'hidden' && r.reject_reason === 'kedaluwarsa';

/**
 * Loker yang dikirim atau dimiliki member: status review, edit/tarik selama masih
 * menunggu, dan siapa saja yang tertarik (dengan profil, WhatsApp, LinkedIn).
 */
export default function PortalJobs({ loaderData: { items, counts, userId } }: Route.ComponentProps) {
  const { hash } = useLocation();
  const revalidator = useRevalidator();
  const [confirming, setConfirming] = useState<string | null>(null);
  const [closing, setClosing] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ id: string; text: string } | null>(null);
  const [status, setStatus] = useState('');
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Setelah konfirmasi ditutup, fokus kembali ke tombol "Tarik" baris itu (bukan hilang ke body).
  const closeConfirm = (id: string) => {
    setConfirming(null);
    requestAnimationFrame(() => document.getElementById(`tarik-${id}`)?.focus());
  };

  const withdraw = async (r: JobRow) => {
    setBusy(r.id);
    setNotice(null);
    try {
      const result = await withdrawJob(r.id);
      if (result !== 'ok') {
        setNotice({ id: r.id, text: WITHDRAW_ERROR[result] });
        closeConfirm(r.id);
      } else {
        setConfirming(null);
        setStatus(`"${r.title}" sudah ditarik dari antrean peninjauan.`);
        headingRef.current?.focus();
      }
      await revalidator.revalidate();
    } catch {
      setNotice({ id: r.id, text: WITHDRAW_ERROR.failed });
      closeConfirm(r.id);
    } finally {
      setBusy(null);
    }
  };

  const close = async (r: JobRow) => {
    setBusy(r.id);
    setNotice(null);
    const ok = await closeJob(r.id);
    setBusy(null);
    setClosing(null);
    if (!ok) {
      setNotice({ id: r.id, text: 'Gagal menandai sudah tutup. Silakan coba lagi.' });
      return;
    }
    setStatus(`"${r.title}" ditandai sudah tutup dan tidak lagi tampil di daftar loker.`);
    await revalidator.revalidate();
  };

  return (
    <PortalPage
      title={
        <span ref={headingRef} tabIndex={-1}>
          Lokerku
        </span>
      }
      intro="Lowongan yang Anda bagikan, termasuk yang diinput tim loker atas nama Anda, beserta daftar peminatnya. Tandai sudah tutup begitu posisinya terisi."
      actions={
        <Link className="btn btn-primary" to={SUBMIT_PATH}>
          Bagikan loker
        </Link>
      }
    >
      <p className="visually-hidden" role="status">
        {status}
      </p>
      {items === null ? (
        <LoadError what="Lowongan Anda" />
      ) : items.length === 0 ? (
        <p className="psec-empty">
          Belum ada lowongan.{' '}
          <Link className="text-link" to={SUBMIT_PATH}>
            Bagikan lowongan
          </Link>{' '}
          dari grup atau dari tempat Anda bekerja.
        </p>
      ) : (
        <div className="panel">
          <ul className="rows rec-rows">
            {items.map((r) => (
              <li key={r.id} id={`loker-${r.id}`}>
                <div className="row-main">
                  <strong>{r.title}</strong>
                  <span>
                    {companyLabel(r.company)} · {RELATION_LABEL[r.submitter_relation].form}
                    {r.status === 'rejected' && rejectReasonLabel(r.reject_reason) && ` · ${rejectReasonLabel(r.reject_reason)}`}
                    {r.status === 'rejected' && r.reject_note && ` · ${r.reject_note}`}
                  </span>
                  {r.status === 'pending' &&
                    r.submitted_by === userId &&
                    (confirming === r.id ? (
                      <span className="inline-actions rec-row-actions rec-confirm">
                        <span>Tarik dari antrean peninjauan?</span>
                        <button className="link-btn danger" type="button" disabled={busy === r.id} onClick={() => withdraw(r)}>
                          {busy === r.id ? 'Menarik…' : 'Ya, tarik'}
                        </button>
                        <button className="link-btn" type="button" disabled={busy === r.id} onClick={() => closeConfirm(r.id)} autoFocus>
                          Batal
                        </button>
                      </span>
                    ) : (
                      <span className="inline-actions rec-row-actions">
                        <Link className="text-link" to={`${SUBMIT_PATH}?edit=${r.id}`}>
                          Edit
                        </Link>
                        <button
                          id={`tarik-${r.id}`}
                          className="link-btn"
                          type="button"
                          onClick={() => {
                            setNotice(null);
                            setConfirming(r.id);
                          }}
                        >
                          Tarik
                        </button>
                      </span>
                    ))}
                  {r.status === 'approved' &&
                    (closing === r.id ? (
                      <span className="inline-actions rec-row-actions rec-confirm">
                        <span>Posisi ini sudah terisi atau ditutup?</span>
                        <button className="link-btn danger" type="button" disabled={busy === r.id} onClick={() => close(r)}>
                          {busy === r.id ? 'Menyimpan…' : 'Ya, tandai tutup'}
                        </button>
                        <button className="link-btn" type="button" disabled={busy === r.id} onClick={() => setClosing(null)} autoFocus>
                          Batal
                        </button>
                      </span>
                    ) : (
                      <span className="rec-row-actions">
                        <Link className="text-link" to={JOBS_PATH}>
                          Lihat di daftar loker
                        </Link>
                        <button className="link-btn" type="button" onClick={() => setClosing(r.id)}>
                          Tandai sudah tutup
                        </button>
                      </span>
                    ))}
                  {(r.status === 'approved' || isClosed(r)) && (
                    <JobInterested jobId={r.id} count={counts.get(r.id) ?? 0} defaultOpen={hash === `#loker-${r.id}`} />
                  )}
                  {notice?.id === r.id && (
                    <span className="row-error" role="alert">
                      {notice.text}
                    </span>
                  )}
                </div>
                <span className="chip rec-status" data-status={r.status}>
                  {isClosed(r) ? 'Sudah tutup' : STATUS_LABEL[r.status]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </PortalPage>
  );
}
