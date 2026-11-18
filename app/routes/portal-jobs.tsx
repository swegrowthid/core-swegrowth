import { useRef, useState } from 'react';
import { Link, useRevalidator } from 'react-router';
import type { Route } from './+types/portal-jobs';
import { LoadError, PortalPage } from '~/components/Portal';
import { requireUser } from '~/lib/auth';
import type { JobRow } from '~/lib/database.types';
import {
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
  // null = gagal dimuat, beda dengan belum pernah mengusulkan.
  return { items: await fetchMyJobs(user.id).catch(() => null) };
}

export function HydrateFallback() {
  return <div className="loading-block">Memuat lokermu…</div>;
}

const WITHDRAW_ERROR = {
  locked: 'Loker ini sudah direview, jadi tidak bisa ditarik lagi.',
  failed: 'Gagal menarik loker. Cek koneksi, lalu coba lagi.',
} as const;

/** Loker yang dibagikan member: status review, edit/tarik selama masih menunggu. */
export default function PortalJobs({ loaderData: { items } }: Route.ComponentProps) {
  const revalidator = useRevalidator();
  const [confirming, setConfirming] = useState<string | null>(null);
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
        setStatus(`"${r.title}" sudah ditarik dari antrean review.`);
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

  return (
    <PortalPage
      title={
        <span ref={headingRef} tabIndex={-1}>
          Lokerku
        </span>
      }
      intro="Loker yang kamu bagikan ke direktori. Tim loker cek dulu sebelum tayang."
      actions={
        <Link className="btn btn-primary" to={SUBMIT_PATH}>
          Rekomendasikan loker
        </Link>
      }
    >
      <p className="visually-hidden" role="status">
        {status}
      </p>
      {items === null ? (
        <LoadError what="Lokermu" />
      ) : items.length === 0 ? (
        <p className="psec-empty">
          Belum ada loker. Lihat loker bagus di grup atau di kantormu?{' '}
          <Link className="text-link" to={SUBMIT_PATH}>
            Bagikan ke direktori loker
          </Link>
          .
        </p>
      ) : (
        <div className="panel">
          <ul className="rows rec-rows">
            {items.map((r) => (
              <li key={r.id}>
                <div className="row-main">
                  <strong>{r.title}</strong>
                  <span>
                    {r.company} · {RELATION_LABEL[r.submitter_relation].form}
                    {r.status === 'rejected' && rejectReasonLabel(r.reject_reason) && ` · ${rejectReasonLabel(r.reject_reason)}`}
                    {r.status === 'rejected' && r.reject_note && ` · ${r.reject_note}`}
                  </span>
                  {r.status === 'pending' &&
                    (confirming === r.id ? (
                      <span className="inline-actions rec-row-actions rec-confirm">
                        <span>Tarik dari antrean review?</span>
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
                  {r.status === 'approved' && (
                    <span className="rec-row-actions">
                      <Link className="text-link" to={JOBS_PATH}>
                        Lihat di direktori
                      </Link>
                    </span>
                  )}
                  {notice?.id === r.id && (
                    <span className="row-error" role="alert">
                      {notice.text}
                    </span>
                  )}
                </div>
                <span className={`chip rec-status ${r.status}`}>{STATUS_LABEL[r.status]}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </PortalPage>
  );
}
