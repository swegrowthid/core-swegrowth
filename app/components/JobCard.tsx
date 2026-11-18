import { useState } from 'react';
import { Link } from 'react-router';
import { Avatar } from './Avatar';
import { ArrowUpRight } from './Icons';
import {
  companyLabel,
  contactHref,
  EMPLOYMENT_LABEL,
  formatDeadline,
  jobMeta,
  RELATION_LABEL,
  toggleJobInterest,
  type Job,
} from '~/lib/jobs';

/**
 * Kartu loker di /portal/loker. Seluruh kartu membuka link lamaran; kalau melamar lewat CP,
 * kartu membuka kontak CP (WA/email). Tombol Tertarik membagikan profil ke pemilik loker.
 */
export function JobCard({ j, canInterest }: { j: Job; canInterest: boolean }) {
  const cpHref = j.contact ? contactHref(j.contact) : null;
  const href = j.apply_url ?? cpHref;

  return (
    <li className="rec-card job-card" data-type={j.employment_type}>
      <div className="rec-top">
        <span className="rec-cat">{EMPLOYMENT_LABEL[j.employment_type]}</span>
        {j.submitter_relation !== 'share' && <span className="job-relation">{RELATION_LABEL[j.submitter_relation].card}</span>}
        {href && (
          <span className="rec-go" aria-hidden="true">
            <ArrowUpRight />
          </span>
        )}
      </div>
      {/* Link judul menutupi seluruh kartu; link & tombol lain di kartu ada di atasnya. */}
      <h3>
        {href ? (
          <a className="rec-link" href={href} target="_blank" rel="noopener nofollow">
            {j.title}
          </a>
        ) : (
          j.title
        )}
      </h3>
      <span className="rec-organizer">{companyLabel(j.company)}</span>
      {j.description && <p className="rec-reason">{j.description}</p>}
      <ul className="rec-meta">
        {jobMeta(j)
          .slice(1)
          .map((m) => (
            <li key={m}>{m}</li>
          ))}
        {j.deadline && <li className="job-deadline">Tutup {formatDeadline(j.deadline)}</li>}
      </ul>

      {j.contact && (
        <p className="job-cp">
          CP{j.contact_name && ` ${j.contact_name}`}:{' '}
          {cpHref ? (
            <a href={cpHref} target="_blank" rel="noopener nofollow">
              {j.contact}
            </a>
          ) : (
            <span>{j.contact}</span>
          )}
        </p>
      )}

      {j.original_message && (
        <details className="job-original">
          <summary>Lihat pesan asli</summary>
          <p>{j.original_message}</p>
        </details>
      )}

      <InterestBar j={j} canInterest={canInterest} />

      <div className="rec-by">
        {j.owner_name && j.owner_handle ? (
          <Link className="rec-by-member" to={`/member/${j.owner_handle}`}>
            <Avatar name={j.owner_name} src={j.owner_avatar_url} size={20} />
            Dibagikan {j.owner_name}
          </Link>
        ) : j.source === 'poster' ? (
          <span className="rec-by-swe">
            <img src="/assets/swe-growth-logo.png" alt="" width="20" height="20" loading="lazy" />
            Grup Loker SWE Growth
          </span>
        ) : (
          <span>Direkomendasikan member</span>
        )}
        {j.open_to_questions && j.owner_handle && (
          <Link className="job-ask" to={`/member/${j.owner_handle}`}>
            Bisa ditanya
          </Link>
        )}
      </div>
    </li>
  );
}

/** Tombol Tertarik (optimistis) dan jumlah peminat; pemilik loker melihat link ke daftar peminat. */
function InterestBar({ j, canInterest }: { j: Job; canInterest: boolean }) {
  const [interested, setInterested] = useState(j.interested);
  const [count, setCount] = useState(j.interest_count);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async () => {
    const next = !interested;
    setBusy(true);
    setError(null);
    setInterested(next);
    setCount((c) => c + (next ? 1 : -1));
    const { data, error: rpcError } = await toggleJobInterest(j.id);
    setBusy(false);
    if (rpcError || data !== next) {
      setInterested(!next);
      setCount((c) => c - (next ? 1 : -1));
      setError(rpcError?.message ?? 'Belum tersimpan. Coba lagi.');
    }
  };

  const countText = count > 0 ? `${count} tertarik` : null;

  return (
    <div className="job-interest">
      {j.is_mine ? (
        <Link className="btn btn-ghost sm" to={`/portal/lokerku#loker-${j.id}`}>
          {count > 0 ? `Lihat ${count} yang tertarik` : 'Belum ada yang tertarik'}
        </Link>
      ) : canInterest ? (
        <button
          className={`btn sm ${interested ? 'btn-primary' : 'btn-ghost'}`}
          type="button"
          aria-pressed={interested}
          disabled={busy}
          onClick={toggle}
          title={interested ? 'Batalkan' : 'Pemilik loker bisa melihat profil, WhatsApp, dan LinkedIn-mu'}
        >
          {interested ? '✓ Tertarik' : 'Tertarik'}
        </button>
      ) : (
        <Link className="btn btn-ghost sm" to="/portal/profil/edit" title="Lengkapi profil untuk menandai tertarik">
          Tertarik
        </Link>
      )}
      {!j.is_mine && countText && <span className="job-interest-count">{countText}</span>}
      {error && (
        <span className="row-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
