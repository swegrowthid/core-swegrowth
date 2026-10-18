import { useState, type FormEvent } from 'react';
import { Link, redirect, useSearchParams } from 'react-router';
import type { Route } from './+types/recommendation-submit';
import { Field } from '~/lib/admin-form';
import { requireUser } from '~/lib/auth';
import type {
  ActivityMode,
  RecommendationCategory,
  RecommendationLanguage,
  RecommendationPrice,
  RecommendationRow,
} from '~/lib/database.types';
import {
  CATEGORIES,
  categoryOf,
  directoryPath,
  getRecommendationTopics,
  isCategory,
  LANGUAGE_LABEL,
  PRICE_LABEL,
  STATUS_LABEL,
  checkRecommendationUrl,
  fetchOwnRecommendation,
  submitRecommendation,
} from '~/lib/recommendations';

export const meta: Route.MetaFunction = () => [{ title: 'Kirim rekomendasi — SWE Growth' }, { name: 'robots', content: 'noindex' }];

const MAX_TOPICS = 3;
const REASON_MIN = 30;
const REASON_MAX = 300;

/** ?edit=<id>: edit usulan sendiri yang masih menunggu review. */
export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const user = await requireUser(request);
  const editId = new URL(request.url).searchParams.get('edit');
  const topics = await getRecommendationTopics();
  if (!editId) return { editing: null, topics };

  const data = await fetchOwnRecommendation(editId, user.id);
  if (!data || data.status !== 'pending') throw redirect('/portal');
  return { editing: data, topics };
}

export function HydrateFallback() {
  return <div className="loading-block">Memuat…</div>;
}

export default function RecommendationSubmit({ loaderData: { editing, topics } }: Route.ComponentProps) {
  return <SubmitForm key={editing?.id ?? 'new'} editing={editing} topicNames={topics} />;
}

function SubmitForm({ editing, topicNames }: { editing: RecommendationRow | null; topicNames: string[] }) {
  // ?kategori=acara dari agenda: langsung pilih kategorinya.
  const [params] = useSearchParams();
  const preset = params.get('kategori');
  const [category, setCategory] = useState<RecommendationCategory>(editing?.category ?? (isCategory(preset) ? preset : 'buku'));
  const [topics, setTopics] = useState<string[]>(editing?.topics ?? []);
  const [reasonLength, setReasonLength] = useState(editing?.reason.length ?? 0);
  const [duplicate, setDuplicate] = useState<{ title: string; status: RecommendationRow['status'] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const isEvent = category === 'acara';

  // Form dipasang ulang saat done=false, jadi isian kembali kosong.
  const startOver = () => {
    setCategory('buku');
    setTopics([]);
    setReasonLength(0);
    setDuplicate(null);
    setDone(false);
  };

  const checkUrl = async (url: string) => {
    if (!/^https:\/\/\S+\.\S+/.test(url.trim())) return setDuplicate(null);
    setDuplicate((await checkRecommendationUrl(url, editing?.id ?? null)) ?? null);
  };

  const toggleTopic = (t: string) =>
    setTopics((list) => (list.includes(t) ? list.filter((x) => x !== t) : list.length < MAX_TOPICS ? [...list, t] : list));

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const val = (name: string) => String(form.get(name) ?? '').trim();

    if (val('reason').length < REASON_MIN) {
      setError(`Ceritakan alasanmu minimal ${REASON_MIN} karakter, ya. Ini yang paling dibaca orang.`);
      return;
    }

    setBusy(true);
    setError(null);
    const { error: rpcError } = await submitRecommendation({
      p_category: category,
      p_title: val('title'),
      p_url: val('url'),
      p_reason: val('reason'),
      p_organizer: val('organizer'),
      p_topics: topics,
      p_price: (val('price') || null) as RecommendationPrice | null,
      p_language: (val('language') || null) as RecommendationLanguage | null,
      p_event_date: isEvent ? val('event_date') || null : null,
      p_event_mode: isEvent ? ((val('event_mode') || null) as ActivityMode | null) : null,
      p_location: isEvent ? val('location') : '',
      p_show_recommender: form.get('show_recommender') === 'on',
      p_id: editing?.id ?? null,
    });
    setBusy(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setDone(true);
    window.scrollTo({ top: 0 });
  };

  if (done) {
    return (
      <section className="block">
        <div className="wrap narrow-wrap">
          <div className="form-card rec-done">
            <span className="check-badge" aria-hidden="true">
              ✓
            </span>
            <h1 className="page-title">{editing ? 'Perubahan tersimpan' : 'Makasih udah berbagi!'}</h1>
            <p className="form-sub">Admin cek dulu sebelum tayang di direktori, biasanya 1–3 hari. Statusnya bisa kamu pantau di portal.</p>
            <div className="inline-actions">
              <Link className="btn btn-primary" to="/portal#rekomendasiku">
                Lihat status di portal
              </Link>
              {!editing && (
                <button className="btn btn-ghost" type="button" onClick={startOver}>
                  Kirim rekomendasi lain
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="block">
      <div className="wrap narrow-wrap rec-form-wrap">
        <Link className="back" to={directoryPath()}>
          ← Rekomendasi
        </Link>
        <form className="form-card rec-form" onSubmit={onSubmit}>
          <h1 className="page-title">{editing ? 'Edit rekomendasi' : 'Kirim rekomendasi'}</h1>
          <p className="form-sub">
            Acara, komunitas, course, buku, atau apa pun yang bikin kamu grow. Admin cek dulu sebelum tayang.
            {editing && (
              <>
                {' '}
                Status sekarang: <b>{STATUS_LABEL[editing.status]}</b>.
              </>
            )}
          </p>

          <fieldset className="field">
            <legend>Jenisnya apa?</legend>
            <div className="rec-pick" role="radiogroup">
              {CATEGORIES.map((c) => (
                <label key={c.id} className={category === c.id ? 'on' : undefined}>
                  <input type="radio" name="category" value={c.id} checked={category === c.id} onChange={() => setCategory(c.id)} />
                  {c.label}
                </label>
              ))}
            </div>
          </fieldset>

          <Field id="r_title" label="Nama">
            <input
              id="r_title"
              name="title"
              required
              minLength={2}
              maxLength={120}
              defaultValue={editing?.title}
              placeholder="Mis. Designing Data-Intensive Applications"
            />
          </Field>

          <Field id="r_url" label="Link">
            <input
              id="r_url"
              name="url"
              type="url"
              required
              pattern="https://.*"
              placeholder="https://…"
              defaultValue={editing?.url}
              onBlur={(e) => void checkUrl(e.target.value)}
              onChange={() => duplicate && setDuplicate(null)}
            />
          </Field>
          {duplicate && (
            <p className="form-message error">
              {duplicate.status === 'pending'
                ? `Link ini sudah diusulkan ("${duplicate.title}") dan lagi direview.`
                : `"${duplicate.title}" sudah ada di direktori.`}
            </p>
          )}

          <Field
            id="r_reason"
            label="Kenapa kamu rekomendasikan?"
            hint={`${reasonLength}/${REASON_MAX} · minimal ${REASON_MIN} karakter. Ini isi utama kartunya.`}
          >
            <textarea
              id="r_reason"
              name="reason"
              rows={3}
              required
              minLength={REASON_MIN}
              maxLength={REASON_MAX}
              defaultValue={editing?.reason}
              placeholder="Mis. Bikin aku paham trade-off database terdistribusi tanpa harus baca paper satu-satu."
              onChange={(e) => setReasonLength(e.target.value.length)}
            />
          </Field>

          <Field id="r_org" label={categoryOf(category).organizerLabel} optional>
            <input id="r_org" name="organizer" maxLength={120} defaultValue={editing?.organizer} />
          </Field>

          {isEvent && (
            <div className="rec-row">
              <Field id="r_date" label="Tanggal" optional>
                <input id="r_date" name="event_date" type="date" defaultValue={editing?.event_date ?? ''} />
              </Field>
              <Field id="r_mode" label="Format" optional>
                <select id="r_mode" name="event_mode" defaultValue={editing?.event_mode ?? ''}>
                  <option value="">—</option>
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </Field>
              <Field id="r_loc" label="Kota" optional>
                <input id="r_loc" name="location" maxLength={80} defaultValue={editing?.location} />
              </Field>
            </div>
          )}

          <fieldset className="field">
            <legend>
              Topik <small>(opsional, maks. {MAX_TOPICS})</small>
            </legend>
            <div className="rec-pick">
              {topicNames.map((t) => {
                const on = topics.includes(t);
                return (
                  <label key={t} className={on ? 'on' : undefined}>
                    <input type="checkbox" checked={on} disabled={!on && topics.length >= MAX_TOPICS} onChange={() => toggleTopic(t)} />
                    {t}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="rec-row">
            <Field id="r_price" label="Harga" optional>
              <select id="r_price" name="price" defaultValue={editing?.price ?? ''}>
                <option value="">—</option>
                {(Object.keys(PRICE_LABEL) as RecommendationPrice[]).map((p) => (
                  <option key={p} value={p}>
                    {PRICE_LABEL[p]}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="r_lang" label="Bahasa" optional>
              <select id="r_lang" name="language" defaultValue={editing?.language ?? ''}>
                <option value="">—</option>
                {(Object.keys(LANGUAGE_LABEL) as RecommendationLanguage[]).map((l) => (
                  <option key={l} value={l}>
                    {LANGUAGE_LABEL[l]}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <label className="rec-check">
            <input type="checkbox" name="show_recommender" defaultChecked={editing?.show_recommender ?? true} />
            Tampilkan namaku sebagai yang merekomendasikan
          </label>

          <p className="rec-rules">
            Course berbayar boleh. Link afiliasi dan promosi diri tidak, kecuali afiliasi resmi SWE Growth yang dipasang admin. Selengkapnya
            di <Link to="/code-of-conduct">Code of Conduct</Link>.
          </p>

          {error && <p className="form-message error">{error}</p>}
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Mengirim…' : editing ? 'Simpan perubahan' : 'Kirim rekomendasi'}
          </button>
        </form>
      </div>
    </section>
  );
}
