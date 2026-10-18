import { Link, useSearchParams } from 'react-router';
import type { Route } from './+types/recommendations';
import { RecommendationCard } from '~/components/RecommendationCard';
import type { RecommendationLanguage, RecommendationPrice } from '~/lib/database.types';
import {
  CATEGORIES,
  getPublishedRecommendations,
  getRecommendationTopics,
  isCategory,
  LANGUAGE_LABEL,
  PRICE_LABEL,
  SUBMIT_PATH,
} from '~/lib/recommendations';
import { pageMeta } from '~/lib/site';

export const meta: Route.MetaFunction = () =>
  pageMeta(
    'Rekomendasi — SWE Growth',
    'Acara, komunitas, course, buku, podcast, YouTube, newsletter, dan web yang direkomendasikan SWE Growth dan member-nya.',
  );

/** Saat build: snapshot untuk HTML prerender. */
const load = async () => {
  const [items, topics] = await Promise.all([getPublishedRecommendations(), getRecommendationTopics()]);
  return { items, topics };
};

export async function loader() {
  return load();
}

/** Di browser: selalu ambil yang terbaru. */
export async function clientLoader() {
  return load();
}
clientLoader.hydrate = true as const;

/** Filter disimpan di URL supaya hasil filter bisa dibagikan. */
export default function Recommendations({ loaderData: { items, topics: topicNames } }: Route.ComponentProps) {
  const [params, setParams] = useSearchParams();
  const category = params.get('kategori');
  const topic = params.get('topik') ?? '';
  const price = params.get('harga') ?? '';
  const language = params.get('bahasa') ?? '';
  const query = params.get('q') ?? '';

  const set = (key: string, value: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true, preventScrollReset: true },
    );

  const q = query.trim().toLowerCase();
  // Filter selain kategori dulu, supaya jumlah per kategori ikut filter lain.
  const base = items.filter(
    (r) =>
      (!topic || r.topics.includes(topic)) &&
      (!price || r.price === price) &&
      (!language || r.language === language) &&
      (!q || [r.title, r.organizer, r.reason, ...r.topics].some((v) => v.toLowerCase().includes(q))),
  );
  const shown = isCategory(category) ? base.filter((r) => r.category === category) : base;
  const countOf = (id: string) => base.filter((r) => r.category === id).length;
  const filtered = Boolean(topic || price || language || q);
  // Hanya topik yang benar-benar dipakai, urut sesuai daftar topik.
  const usedTopics = topicNames.filter((t) => items.some((r) => r.topics.includes(t)));

  return (
    <section className="block">
      <div className="wrap narrow-wrap">
        <div className="rec-head">
          <div>
            <h1 className="page-title">Tempat buat grow</h1>
            <p className="muted">
              Acara, komunitas, course, buku, podcast, YouTube, newsletter, dan web yang kami dan member rekomendasikan.
            </p>
          </div>
          <Link className="btn btn-primary" to={SUBMIT_PATH}>
            Kirim rekomendasi
          </Link>
        </div>

        <nav className="rec-tabs" aria-label="Kategori">
          <button type="button" aria-pressed={!isCategory(category)} onClick={() => set('kategori', '')}>
            Semua <span>{base.length}</span>
          </button>
          {CATEGORIES.map((c) => (
            <button key={c.id} type="button" aria-pressed={category === c.id} onClick={() => set('kategori', c.id)}>
              {c.label} <span>{countOf(c.id)}</span>
            </button>
          ))}
        </nav>

        <div className="rec-filters">
          <input
            type="search"
            aria-label="Cari rekomendasi"
            placeholder="Cari judul, penulis, atau topik…"
            defaultValue={query}
            onChange={(e) => set('q', e.target.value)}
          />
          <select aria-label="Topik" value={topic} onChange={(e) => set('topik', e.target.value)}>
            <option value="">Semua topik</option>
            {usedTopics.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select aria-label="Harga" value={price} onChange={(e) => set('harga', e.target.value)}>
            <option value="">Semua harga</option>
            {(Object.keys(PRICE_LABEL) as RecommendationPrice[]).map((p) => (
              <option key={p} value={p}>
                {PRICE_LABEL[p]}
              </option>
            ))}
          </select>
          <select aria-label="Bahasa" value={language} onChange={(e) => set('bahasa', e.target.value)}>
            <option value="">Semua bahasa</option>
            {(Object.keys(LANGUAGE_LABEL) as RecommendationLanguage[]).map((l) => (
              <option key={l} value={l}>
                {LANGUAGE_LABEL[l]}
              </option>
            ))}
          </select>
        </div>

        {shown.length > 0 ? (
          <ul className="rec-grid start">
            {shown.map((r) => (
              <RecommendationCard key={r.id} r={r} />
            ))}
          </ul>
        ) : (
          <div className="empty-note rec-empty">
            <p>{filtered || isCategory(category) ? 'Belum ada rekomendasi buat filter ini.' : 'Belum ada rekomendasi.'} Tahu yang bagus?</p>
            <Link className="btn btn-primary" to={SUBMIT_PATH}>
              Kirim ke kita
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
