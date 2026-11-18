import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Avatar } from './Avatar';
import { Check, PinIcon } from './Icons';
import { JobInterestDialog } from './JobInterestDialog';
import { formatWibDate, formatWibTime } from '~/lib/format';
import {
  companyLabel,
  contactHref,
  EMPLOYMENT_LABEL,
  formatDeadline,
  LEVEL_LABEL,
  postedAgo,
  RELATION_LABEL,
  WORK_MODE_LABEL,
  type Job,
} from '~/lib/jobs';

/**
 * Satu baris di daftar /portal/loker, ala job board: posisi & gaji, tag, perusahaan & kota.
 * Seluruh kartu membuka link lamaran (atau kontak CP kalau melamar lewat CP). Tombol
 * Tertarik membagikan profil ke yang membagikan loker.
 */
export function JobCard({ j, canInterest }: { j: Job; canInterest: boolean }) {
  const cpHref = j.contact ? contactHref(j.contact) : null;
  const href = j.apply_url ?? cpHref;

  return (
    <li className="job-item" data-type={j.employment_type}>
      <div className="job-item-head">
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
        {j.salary && <span className="job-salary">{j.salary}</span>}
      </div>

      <ul className="job-tags">
        <li className="job-tag-type">{EMPLOYMENT_LABEL[j.employment_type]}</li>
        <li>{WORK_MODE_LABEL[j.work_mode]}</li>
        {j.level && <li>{LEVEL_LABEL[j.level]}</li>}
        {j.submitter_relation !== 'share' && <li className="job-tag-relation">{RELATION_LABEL[j.submitter_relation].card}</li>}
        {j.deadline && <li className="job-deadline">Tutup {formatDeadline(j.deadline)}</li>}
      </ul>

      <p className="job-company">
        <strong>{companyLabel(j.company)}</strong>
        {j.location && (
          <span>
            <PinIcon />
            {j.location}
          </span>
        )}
      </p>

      {j.description && <p className="job-desc">{j.description}</p>}

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

      <JobActions j={j} canInterest={canInterest}>
        <div className="job-by">
          {j.owner_name && j.owner_handle ? (
            <Link className="rec-by-member" to={`/member/${j.owner_handle}`}>
              <Avatar name={j.owner_name} src={j.owner_avatar_url} size={20} />
              {j.owner_name}
            </Link>
          ) : j.source === 'poster' ? (
            <span className="rec-by-swe">
              <img src="/assets/swe-growth-logo.png" alt="" width="20" height="20" loading="lazy" />
              Grup Loker SWE Growth
            </span>
          ) : (
            <span>Rekomendasi member</span>
          )}
          <time dateTime={j.created_at} title={`${formatWibDate(j.created_at)}, ${formatWibTime(j.created_at)}`}>
            {postedAgo(j.created_at)}
          </time>
          {j.open_to_questions && j.owner_handle && (
            <Link className="job-ask" to={`/member/${j.owner_handle}`}>
              Bisa ditanya
            </Link>
          )}
        </div>
      </JobActions>
    </li>
  );
}

/**
 * Baris bawah kartu: siapa yang membagikan (children) dan tombol Tertarik. Tertarik membuka
 * JobInterestDialog (bottom sheet di HP) untuk catatan relevansi dan pesan WhatsApp.
 */
function JobActions({ j, canInterest, children }: { j: Job; canInterest: boolean; children: ReactNode }) {
  const [interested, setInterested] = useState(j.interested);
  const [count, setCount] = useState(j.interest_count);
  const [open, setOpen] = useState(false);

  return (
    <div className="job-foot">
      {children}
      <div className="job-interest">
        {!j.is_mine && count > 0 && <span className="job-interest-count">{count} tertarik</span>}
        {j.is_mine ? (
          <Link className="btn btn-ghost sm" to={`/portal/lokerku#loker-${j.id}`}>
            {count > 0 ? `Lihat ${count} peminat` : 'Belum ada peminat'}
          </Link>
        ) : canInterest ? (
          <button
            className={`btn sm ${interested ? 'btn-primary' : 'btn-ghost'}`}
            type="button"
            aria-haspopup="dialog"
            onClick={() => setOpen(true)}
          >
            {interested && <Check />}
            Tertarik
          </button>
        ) : (
          <Link className="btn btn-ghost sm" to="/portal/profil/edit" title="Lengkapi profil untuk menandai tertarik">
            Tertarik
          </Link>
        )}
      </div>
      {open && (
        <JobInterestDialog
          j={j}
          interested={interested}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setInterested(true);
            setCount((c) => c + 1);
          }}
          onWithdrawn={() => {
            setInterested(false);
            setCount((c) => c - 1);
          }}
        />
      )}
    </div>
  );
}
