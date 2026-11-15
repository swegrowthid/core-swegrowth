import { useRef, useState } from 'react';
import { Link, useRevalidator } from 'react-router';
import type { Route } from './+types/portal-recommendations';
import { LoadError, PortalPage } from '~/components/Portal';
import { requireUser } from '~/lib/auth';
import type { RecommendationRow } from '~/lib/database.types';
import {
  categoryOf,
  directoryPath,
  fetchMyRecommendations,
  rejectReasonLabel,
  STATUS_LABEL,
  SUBMIT_PATH,
  withdrawRecommendation,
} from '~/lib/recommendations';

export const meta: Route.MetaFunction = () => [{ title: 'Rekomendasiku — SWE Growth' }, { name: 'robots', content: 'noindex' }];

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const user = await requireUser(request);
  // null = gagal dimuat, beda dengan belum pernah mengusulkan.
  return { items: await fetchMyRecommendations(user.id).catch(() => null) };
}

export function HydrateFallback() {
  return <div className="loading-block">Memuat rekomendasimu…</div>;
}

const WITHDRAW_ERROR = {
  locked: 'Usulan ini sudah direview, jadi tidak bisa ditarik lagi.',
  failed: 'Gagal menarik usulan. Cek koneksi, lalu coba lagi.',
} as const;

/** Usulan rekomendasi milik member: status review, edit/tarik selama masih menunggu. */
export default function PortalRecommendations({ loaderData: { items } }: Route.ComponentProps) {
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

  const withdraw = async (r: RecommendationRow) => {
    setBusy(r.id);
    setNotice(null);
    try {
      const result = await withdrawRecommendation(r.id);
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
          Rekomendasiku
        </span>
      }
      intro="Acara, komunitas, course, atau buku yang kamu usulkan. Admin cek dulu sebelum tayang di direktori."
      actions={
        <Link className="btn btn-primary" to={SUBMIT_PATH}>
          Kirim rekomendasi
        </Link>
      }
    >
      <p className="visually-hidden" role="status">
        {status}
      </p>
      {items === null ? (
        <LoadError what="Rekomendasimu" />
      ) : items.length === 0 ? (
        <p className="psec-empty">
          Belum ada usulan. Tahu sesuatu yang bikin kamu grow?{' '}
          <Link className="text-link" to={SUBMIT_PATH}>
            Rekomendasikan ke member lain
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
                    {categoryOf(r.category).label}
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
                      <Link className="text-link" to={directoryPath(r.category)}>
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
