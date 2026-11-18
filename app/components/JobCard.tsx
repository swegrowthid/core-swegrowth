import { Link, useLocation } from 'react-router';
import { Avatar } from './Avatar';
import { ArrowUpRight } from './Icons';
import { loginPath } from '~/lib/auth';
import { companyLabel, contactHref, EMPLOYMENT_LABEL, formatDeadline, jobMeta, RELATION_LABEL, type Job } from '~/lib/jobs';

/**
 * Kartu loker di /loker. Seluruh kartu membuka link lamaran; kalau melamar lewat CP,
 * kartu membuka kontak CP (WA/email). Kontak CP hanya dikirim ke yang sudah login.
 */
export function JobCard({ j }: { j: Job }) {
  const { pathname, search } = useLocation();
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
      {/* Link judul menutupi seluruh kartu; link lain di kartu ada di atasnya. */}
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

      {j.has_contact && (
        <p className="job-cp">
          CP{j.contact_name && ` ${j.contact_name}`}:{' '}
          {j.contact ? (
            cpHref ? (
              <a href={cpHref} target="_blank" rel="noopener nofollow">
                {j.contact}
              </a>
            ) : (
              <span>{j.contact}</span>
            )
          ) : (
            <Link to={loginPath(pathname + search)}>masuk untuk lihat kontak</Link>
          )}
        </p>
      )}

      {j.original_message && (
        <details className="job-original">
          <summary>Lihat pesan asli</summary>
          <p>{j.original_message}</p>
        </details>
      )}

      <div className="rec-by">
        {j.submitter_name && j.submitter_handle ? (
          <Link className="rec-by-member" to={`/member/${j.submitter_handle}`}>
            <Avatar name={j.submitter_name} src={j.submitter_avatar_url} size={20} />
            {j.source === 'poster' ? 'Dibagikan' : 'Direkomendasikan'} {j.submitter_name}
          </Link>
        ) : j.source === 'poster' ? (
          <span className="rec-by-swe">
            <img src="/assets/swe-growth-logo.png" alt="" width="20" height="20" loading="lazy" />
            Grup Loker SWE Growth
          </span>
        ) : (
          <span>Direkomendasikan member</span>
        )}
        {j.open_to_questions && j.submitter_handle && (
          <Link className="job-ask" to={`/member/${j.submitter_handle}`}>
            Bisa ditanya
          </Link>
        )}
      </div>
    </li>
  );
}
