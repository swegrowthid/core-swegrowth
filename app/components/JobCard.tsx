import { Link } from 'react-router';
import { Avatar } from './Avatar';
import { ArrowUpRight } from './Icons';
import { EMPLOYMENT_LABEL, formatDeadline, jobMeta, RELATION_LABEL, type Job } from '~/lib/jobs';

/** Kartu loker di /loker. Seluruh kartu membuka link lamaran (atau email HR). */
export function JobCard({ j }: { j: Job }) {
  return (
    <li className="rec-card job-card" data-type={j.employment_type}>
      <div className="rec-top">
        <span className="rec-cat">{EMPLOYMENT_LABEL[j.employment_type]}</span>
        {j.submitter_relation !== 'share' && <span className="job-relation">{RELATION_LABEL[j.submitter_relation].card}</span>}
        <span className="rec-go" aria-hidden="true">
          <ArrowUpRight />
        </span>
      </div>
      {/* Link judul menutupi seluruh kartu; link pengirim ada di atasnya. */}
      <h3>
        <a className="rec-link" href={j.apply_url} target="_blank" rel="noopener nofollow">
          {j.title}
        </a>
      </h3>
      <span className="rec-organizer">{j.company}</span>
      <p className="rec-reason">{j.description}</p>
      <ul className="rec-meta">
        {jobMeta(j)
          .slice(1)
          .map((m) => (
            <li key={m}>{m}</li>
          ))}
        {j.deadline && <li className="job-deadline">Tutup {formatDeadline(j.deadline)}</li>}
      </ul>
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
