import { Link } from 'react-router';
import { Avatar } from './Avatar';
import { ArrowUpRight } from './Icons';
import { categoryOf, recommendationMeta, type Recommendation } from '~/lib/recommendations';

/** Kartu rekomendasi (landing & /rekomendasi). Seluruh kartu membuka link aslinya. */
export function RecommendationCard({ r }: { r: Recommendation }) {
  const category = categoryOf(r.category);
  const meta = recommendationMeta(r);

  return (
    <li className="rec-card" data-category={r.category}>
      <div className="rec-top">
        <span className="rec-cat">{category.label}</span>
        <span className="rec-go" aria-hidden="true">
          <ArrowUpRight />
        </span>
      </div>
      {/* Link judul menutupi seluruh kartu; link pengusul ada di atasnya. */}
      <h3>
        <a className="rec-link" href={r.url} target="_blank" rel={r.is_affiliate ? 'noopener sponsored' : 'noopener'}>
          {r.title}
        </a>
      </h3>
      {r.organizer && (
        <span className="rec-organizer">
          {category.organizerLabel}: {r.organizer}
        </span>
      )}
      <p className="rec-reason">{r.reason}</p>
      {meta.length > 0 && (
        <ul className="rec-meta">
          {meta.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}
      <div className="rec-by">
        {r.recommender_name && r.recommender_handle ? (
          <Link className="rec-by-member" to={`/member/${r.recommender_handle}`}>
            <Avatar name={r.recommender_name} src={r.recommender_avatar_url} size={20} />
            Direkomendasikan {r.recommender_name}
          </Link>
        ) : r.source === 'admin' ? (
          <span className="rec-by-swe">
            <img src="/assets/swe-growth-logo.png" alt="" width="20" height="20" loading="lazy" />
            Pilihan SWE Growth
          </span>
        ) : (
          <span>Direkomendasikan member</span>
        )}
        {r.is_affiliate && (
          <span className="rec-aff" title="Pembelian lewat link ini ikut mendukung SWE Growth">
            Link afiliasi SWE Growth
          </span>
        )}
      </div>
    </li>
  );
}
