import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Field, useMutation, val } from '~/lib/admin-form';
import { useAuth } from '~/lib/auth';
import type {
  ActivityMode,
  ProfileRow,
  RecommendationCategory,
  RecommendationLanguage,
  RecommendationPrice,
  RecommendationRejectReason,
  RecommendationRow,
  RecommendationStatus,
  RecommendationTopicRow,
} from '~/lib/database.types';
import { formatDate } from '~/lib/format';
import {
  CATEGORIES,
  categoryOf,
  LANGUAGE_LABEL,
  PRICE_LABEL,
  recommendationMeta,
  REJECT_REASONS,
  rejectReasonLabel,
  STATUS_LABEL,
} from '~/lib/recommendations';
import { supabase } from '~/lib/supabase';

const VIEWS: { id: RecommendationStatus; label: string }[] = [
  { id: 'pending', label: 'Menunggu' },
  { id: 'approved', label: 'Tayang' },
  { id: 'hidden', label: 'Disembunyikan' },
  { id: 'rejected', label: 'Ditolak' },
];

const normalizeUrl = (url: string) => url.trim().replace(/\/+$/, '').toLowerCase();

/**
 * Tab "Rekomendasi" di /admin: antrean usulan member, tambah langsung
 * ("Pilihan SWE Growth" atau atas nama member), featured untuk landing,
 * sembunyikan/hapus, dan kelola daftar topik.
 */
export function RecommendationsAdmin({
  items,
  profiles,
  topics,
}: {
  items: RecommendationRow[];
  profiles: ProfileRow[];
  topics: RecommendationTopicRow[];
}) {
  const { user } = useAuth();
  const { busy, run, flash } = useMutation();
  const [view, setView] = useState<RecommendationStatus>('pending');
  const [editing, setEditing] = useState<RecommendationRow | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);

  const profileOf = new Map(profiles.map((p) => [p.id, p]));
  const members = profiles.filter((p) => p.full_name).sort((a, b) => a.full_name.localeCompare(b.full_name));
  const countOf = (s: RecommendationStatus) => items.filter((r) => r.status === s).length;
  const shown = items
    .filter((r) => r.status === view)
    .sort((a, b) => (view === 'approved' ? Number(b.is_featured) - Number(a.is_featured) || a.featured_order - b.featured_order : 0));
  const duplicateOf = (r: RecommendationRow) =>
    items.find((o) => o.id !== r.id && o.status !== 'rejected' && normalizeUrl(o.url) === normalizeUrl(r.url));

  const reviewed = () => ({ reviewed_by: user?.id ?? null, reviewed_at: new Date().toISOString() });

  const setStatus = (r: RecommendationRow, status: RecommendationStatus, message: string) =>
    run(
      () =>
        supabase()
          .from('recommendations')
          .update({
            status,
            ...(status === 'approved' || status === 'rejected' ? reviewed() : {}),
            ...(status !== 'rejected' ? { reject_reason: null, reject_note: '' } : {}),
          })
          .eq('id', r.id),
      message,
    );

  const reject = async (e: FormEvent<HTMLFormElement>, r: RecommendationRow) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const ok = await run(
      () =>
        supabase()
          .from('recommendations')
          .update({
            status: 'rejected',
            reject_reason: val(form, 'reject_reason') as RecommendationRejectReason,
            reject_note: val(form, 'reject_note'),
            is_featured: false,
            ...reviewed(),
          })
          .eq('id', r.id),
      `"${r.title}" ditolak. Pengusul melihat alasannya di portal.`,
    );
    if (ok) setRejecting(null);
  };

  const toggleFeatured = (r: RecommendationRow) =>
    run(
      () => supabase().from('recommendations').update({ is_featured: !r.is_featured }).eq('id', r.id),
      r.is_featured ? `"${r.title}" tidak lagi tampil di landing.` : `"${r.title}" tampil di landing.`,
    );

  const remove = (r: RecommendationRow) => {
    if (!confirm(`Hapus "${r.title}" permanen?`)) return;
    void run(() => supabase().from('recommendations').delete().eq('id', r.id), 'Rekomendasi dihapus.');
  };

  return (
    <div className="admin-grid">
      <RecommendationForm
        key={editing?.id ?? 'new'}
        editing={editing}
        members={members}
        topicNames={topics.map((t) => t.name)}
        busy={busy}
        flash={flash}
        onDone={() => setEditing(null)}
        save={(row, approve) =>
          editing
            ? run(
                () =>
                  supabase()
                    .from('recommendations')
                    .update({ ...row, ...(approve ? { status: 'approved' as const, ...reviewed() } : {}) })
                    .eq('id', editing.id),
                approve ? `"${row.title}" disetujui dan tayang.` : 'Rekomendasi diperbarui.',
              )
            : run(
                () =>
                  supabase()
                    .from('recommendations')
                    .insert({ ...row, source: 'admin', status: 'approved', ...reviewed() }),
                'Rekomendasi ditambahkan dan langsung tayang.',
              )
        }
      />

      <div className="panel">
        <nav className="member-tabs rec-admin-tabs" aria-label="Status rekomendasi">
          {VIEWS.map((v) => (
            <a
              key={v.id}
              href={`#${v.id}`}
              aria-current={view === v.id ? 'page' : undefined}
              onClick={(e) => {
                e.preventDefault();
                setView(v.id);
              }}
            >
              {v.label} ({countOf(v.id)})
            </a>
          ))}
        </nav>

        {shown.length === 0 ? (
          <p className="form-sub" style={{ marginTop: 16 }}>
            {view === 'pending'
              ? 'Antrean kosong. Semua usulan sudah diproses.'
              : `Belum ada rekomendasi berstatus "${STATUS_LABEL[view].toLowerCase()}".`}
          </p>
        ) : (
          <ul className="admin-list">
            {shown.map((r) => {
              const by = r.submitted_by ? profileOf.get(r.submitted_by) : null;
              const dup = duplicateOf(r);
              const meta = recommendationMeta(r);
              return (
                <li key={r.id}>
                  <div className="rec-admin-item">
                    <div>
                      <strong>
                        {r.is_featured && <span className="chip yellow">Featured {r.featured_order}</span>} {r.title}
                      </strong>
                      <span className="slug">
                        {[categoryOf(r.category).label, r.organizer, ...meta, r.is_affiliate && 'afiliasi SWE Growth']
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                      <a className="slug" href={r.url} target="_blank" rel="noopener">
                        {r.url}
                      </a>
                      <p className="rec-admin-reason">{r.reason}</p>
                      {r.topics.length > 0 && <span className="slug">Topik: {r.topics.join(', ')}</span>}
                      <span className="slug">
                        {r.source === 'admin' ? (
                          <>
                            Ditambahkan admin
                            {r.submitted_by && (
                              <>
                                {' '}
                                atas nama{' '}
                                {by ? <Link to={`/admin/member/${by.id}`}>{by.full_name || by.email}</Link> : 'member (akun dihapus)'}
                              </>
                            )}
                          </>
                        ) : (
                          <>
                            Diusulkan {by ? <Link to={`/admin/member/${by.id}`}>{by.full_name || by.email}</Link> : 'member (akun dihapus)'}
                            {!r.show_recommender && ' · nama disembunyikan'}
                          </>
                        )}
                        {` · ${formatDate(r.created_at)}`}
                      </span>
                      {r.status === 'rejected' && (
                        <span className="slug">
                          Alasan: {rejectReasonLabel(r.reject_reason)}
                          {r.reject_note && ` — ${r.reject_note}`}
                        </span>
                      )}
                      {dup && (
                        <p className="form-message error">
                          Link sama dengan "{dup.title}" ({STATUS_LABEL[dup.status].toLowerCase()}).
                        </p>
                      )}
                    </div>

                    <div className="inline-actions">
                      {r.status === 'pending' && (
                        <>
                          <button
                            className="btn btn-primary sm"
                            type="button"
                            disabled={busy}
                            onClick={() => setStatus(r, 'approved', `"${r.title}" disetujui dan tayang.`)}
                          >
                            Setujui
                          </button>
                          <button className="btn btn-ghost sm" type="button" disabled={busy} onClick={() => setEditing(r)}>
                            Edit lalu setujui
                          </button>
                          <button
                            className="link-btn"
                            type="button"
                            disabled={busy}
                            onClick={() => setRejecting(rejecting === r.id ? null : r.id)}
                          >
                            Tolak
                          </button>
                        </>
                      )}
                      {r.status === 'approved' && (
                        <>
                          <button className="btn btn-ghost sm" type="button" disabled={busy} onClick={() => toggleFeatured(r)}>
                            {r.is_featured ? 'Lepas dari landing' : 'Tampilkan di landing'}
                          </button>
                          <button className="link-btn" type="button" disabled={busy} onClick={() => setEditing(r)}>
                            Edit
                          </button>
                          <button
                            className="link-btn"
                            type="button"
                            disabled={busy}
                            onClick={() => setStatus(r, 'hidden', `"${r.title}" disembunyikan dari direktori.`)}
                          >
                            Sembunyikan
                          </button>
                        </>
                      )}
                      {r.status === 'hidden' && (
                        <>
                          <button
                            className="btn btn-ghost sm"
                            type="button"
                            disabled={busy}
                            onClick={() => setStatus(r, 'approved', `"${r.title}" tayang lagi.`)}
                          >
                            Tayangkan lagi
                          </button>
                          <button className="link-btn" type="button" disabled={busy} onClick={() => remove(r)}>
                            Hapus
                          </button>
                        </>
                      )}
                      {r.status === 'rejected' && (
                        <>
                          <button
                            className="btn btn-ghost sm"
                            type="button"
                            disabled={busy || Boolean(dup)}
                            onClick={() => setStatus(r, 'approved', `"${r.title}" disetujui dan tayang.`)}
                          >
                            Setujui
                          </button>
                          <button className="link-btn" type="button" disabled={busy} onClick={() => remove(r)}>
                            Hapus
                          </button>
                        </>
                      )}
                    </div>

                    {rejecting === r.id && (
                      <form className="rec-reject" onSubmit={(e) => reject(e, r)}>
                        <Field id={`rr_${r.id}`} label="Alasan">
                          <select id={`rr_${r.id}`} name="reject_reason" required defaultValue={dup ? 'duplikat' : ''}>
                            <option value="" disabled>
                              Pilih alasan
                            </option>
                            {REJECT_REASONS.map((x) => (
                              <option key={x.id} value={x.id}>
                                {x.label}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field id={`rn_${r.id}`} label="Catatan untuk pengusul" optional>
                          <input id={`rn_${r.id}`} name="reject_note" maxLength={300} />
                        </Field>
                        <div className="inline-actions">
                          <button className="btn btn-primary sm" type="submit" disabled={busy}>
                            Tolak usulan
                          </button>
                          <button className="link-btn" type="button" onClick={() => setRejecting(null)}>
                            Batal
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <TopicsAdmin topics={topics} items={items} />
    </div>
  );
}

/** Topik rekomendasi: ganti nama & hapus ikut diterapkan ke rekomendasi yang memakainya. */
function TopicsAdmin({ topics, items }: { topics: RecommendationTopicRow[]; items: RecommendationRow[] }) {
  const { busy, run, flash } = useMutation();
  const usage = (name: string) => items.filter((r) => r.topics.includes(name)).length;

  const add = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    const name = val(new FormData(formEl), 'name');
    const sort_order = Math.max(0, ...topics.map((t) => t.sort_order)) + 10;
    const ok = await run(() => supabase().from('recommendation_topics').insert({ name, sort_order }), `Topik "${name}" ditambahkan.`);
    if (ok) formEl.reset();
  };

  const rename = (e: FormEvent<HTMLFormElement>, t: RecommendationTopicRow) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = val(form, 'name');
    const sort_order = Number.parseInt(val(form, 'sort_order') || '0', 10);
    if (name === t.name && sort_order === t.sort_order) return;
    void run(() => supabase().from('recommendation_topics').update({ name, sort_order }).eq('name', t.name), `Topik "${name}" disimpan.`);
  };

  const remove = (t: RecommendationTopicRow) => {
    const n = usage(t.name);
    if (!confirm(n > 0 ? `Hapus topik "${t.name}"? Topik ini dilepas dari ${n} rekomendasi.` : `Hapus topik "${t.name}"?`)) return;
    void run(() => supabase().from('recommendation_topics').delete().eq('name', t.name), 'Topik dihapus.');
  };

  return (
    <div className="panel">
      <h2>Topik</h2>
      <p className="form-sub">Pilihan topik di form dan filter direktori. Ganti nama ikut mengubah rekomendasi yang memakainya.</p>
      {flash}
      <form className="inline-actions" onSubmit={add}>
        <input name="name" aria-label="Topik baru" placeholder="Topik baru" required minLength={2} maxLength={40} />
        <button className="btn btn-primary sm" type="submit" disabled={busy}>
          Tambah
        </button>
      </form>
      <ul className="admin-list">
        {topics.map((t) => (
          <li key={t.name}>
            <form className="inline-actions" onSubmit={(e) => rename(e, t)}>
              <input name="name" aria-label="Nama topik" required minLength={2} maxLength={40} defaultValue={t.name} />
              <input name="sort_order" aria-label="Urutan" type="number" style={{ width: 80 }} defaultValue={t.sort_order} />
              <span className="slug">{usage(t.name)} rekomendasi</span>
              <button className="btn btn-ghost sm" type="submit" disabled={busy}>
                Simpan
              </button>
              <button className="link-btn" type="button" disabled={busy} onClick={() => remove(t)}>
                Hapus
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}

type RowInput = Pick<
  RecommendationRow,
  | 'category'
  | 'title'
  | 'url'
  | 'reason'
  | 'organizer'
  | 'topics'
  | 'price'
  | 'language'
  | 'event_date'
  | 'event_mode'
  | 'location'
  | 'is_affiliate'
  | 'is_featured'
  | 'featured_order'
> &
  Partial<Pick<RecommendationRow, 'submitted_by'>>;

function RecommendationForm({
  editing,
  members,
  topicNames,
  busy,
  flash,
  save,
  onDone,
}: {
  editing: RecommendationRow | null;
  members: ProfileRow[];
  topicNames: string[];
  busy: boolean;
  flash: React.ReactNode;
  save: (row: RowInput, approve: boolean) => Promise<boolean>;
  onDone: () => void;
}) {
  const [category, setCategory] = useState<RecommendationCategory>(editing?.category ?? 'buku');
  const isEvent = category === 'acara';
  const pending = editing?.status === 'pending';
  // Usulan member tetap milik pengusulnya; hanya tambahan admin yang bisa dikaitkan ke member.
  const canAttribute = !editing || editing.source === 'admin';

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const approve = (e.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'approve';
    const ok = await save(
      {
        category,
        title: val(form, 'title'),
        url: val(form, 'url'),
        reason: val(form, 'reason'),
        organizer: val(form, 'organizer'),
        topics: form.getAll('topics').map(String),
        price: (val(form, 'price') || null) as RecommendationPrice | null,
        language: (val(form, 'language') || null) as RecommendationLanguage | null,
        event_date: isEvent ? val(form, 'event_date') || null : null,
        event_mode: isEvent ? ((val(form, 'event_mode') || null) as ActivityMode | null) : null,
        location: isEvent ? val(form, 'location') : '',
        is_affiliate: form.get('is_affiliate') === 'on',
        is_featured: form.get('is_featured') === 'on',
        featured_order: Number.parseInt(val(form, 'featured_order') || '0', 10),
        ...(canAttribute ? { submitted_by: val(form, 'submitted_by') || null } : {}),
      },
      approve,
    );
    if (ok) {
      onDone();
      formEl.reset();
    }
  };

  return (
    <form className="form-card" onSubmit={onSubmit}>
      <h2>{editing ? (pending ? 'Review usulan' : 'Edit rekomendasi') : 'Tambah rekomendasi'}</h2>
      <p className="form-sub">
        {editing
          ? pending
            ? 'Rapikan dulu kalau perlu, lalu setujui.'
            : `Status: ${STATUS_LABEL[editing.status]}.`
          : 'Tambahan admin langsung tayang sebagai "Pilihan SWE Growth".'}
      </p>
      {flash}
      <Field id="ra_cat" label="Kategori">
        <select id="ra_cat" value={category} onChange={(e) => setCategory(e.target.value as RecommendationCategory)}>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </Field>
      <Field id="ra_title" label="Nama">
        <input id="ra_title" name="title" required minLength={2} maxLength={120} defaultValue={editing?.title} />
      </Field>
      <Field id="ra_url" label="Link">
        <input id="ra_url" name="url" type="url" required pattern="https://.*" defaultValue={editing?.url} />
      </Field>
      <Field id="ra_reason" label="Kenapa direkomendasikan">
        <textarea id="ra_reason" name="reason" rows={3} required minLength={10} maxLength={300} defaultValue={editing?.reason} />
      </Field>
      <Field id="ra_org" label={categoryOf(category).organizerLabel} optional>
        <input id="ra_org" name="organizer" maxLength={120} defaultValue={editing?.organizer} />
      </Field>
      {isEvent && (
        <>
          <Field id="ra_date" label="Tanggal acara" optional hint="Acara yang sudah lewat otomatis tidak tampil.">
            <input id="ra_date" name="event_date" type="date" defaultValue={editing?.event_date ?? ''} />
          </Field>
          <Field id="ra_mode" label="Format" optional>
            <select id="ra_mode" name="event_mode" defaultValue={editing?.event_mode ?? ''}>
              <option value="">—</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </Field>
          <Field id="ra_loc" label="Kota" optional>
            <input id="ra_loc" name="location" maxLength={80} defaultValue={editing?.location} />
          </Field>
        </>
      )}
      {canAttribute && (
        <Field
          id="ra_member"
          label="Atas nama member"
          optional
          hint="Nama & foto member tampil di kartu. Kosongkan supaya tampil sebagai Pilihan SWE Growth."
        >
          <select id="ra_member" name="submitted_by" defaultValue={editing?.submitted_by ?? ''}>
            <option value="">Pilihan SWE Growth</option>
            {members.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
                {p.email ? ` (${p.email})` : ''}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field
        id="ra_topics"
        label="Topik"
        optional
        hint="Tahan Cmd/Ctrl untuk memilih lebih dari satu (maks. 5). Daftar topik diatur di panel Topik."
      >
        <select id="ra_topics" name="topics" multiple size={5} defaultValue={editing?.topics ?? []}>
          {topicNames.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </Field>
      <Field id="ra_price" label="Harga" optional>
        <select id="ra_price" name="price" defaultValue={editing?.price ?? ''}>
          <option value="">—</option>
          {(Object.keys(PRICE_LABEL) as RecommendationPrice[]).map((p) => (
            <option key={p} value={p}>
              {PRICE_LABEL[p]}
            </option>
          ))}
        </select>
      </Field>
      <Field id="ra_lang" label="Bahasa" optional>
        <select id="ra_lang" name="language" defaultValue={editing?.language ?? ''}>
          <option value="">—</option>
          {(Object.keys(LANGUAGE_LABEL) as RecommendationLanguage[]).map((l) => (
            <option key={l} value={l}>
              {LANGUAGE_LABEL[l]}
            </option>
          ))}
        </select>
      </Field>
      <label className="rec-check">
        <input type="checkbox" name="is_featured" defaultChecked={editing?.is_featured} /> Tampilkan di landing (featured)
      </label>
      <Field id="ra_order" label="Urutan di landing" optional>
        <input id="ra_order" name="featured_order" type="number" defaultValue={editing?.featured_order ?? 0} />
      </Field>
      <label className="rec-check">
        <input type="checkbox" name="is_affiliate" defaultChecked={editing?.is_affiliate} /> Link afiliasi resmi SWE Growth
      </label>
      <div className="inline-actions">
        {pending ? (
          <>
            <button className="btn btn-primary" type="submit" value="approve" disabled={busy}>
              Simpan & setujui
            </button>
            <button className="btn btn-ghost" type="submit" value="save" disabled={busy}>
              Simpan saja
            </button>
          </>
        ) : (
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {editing ? 'Simpan perubahan' : 'Simpan & tayangkan'}
          </button>
        )}
        {editing && (
          <button className="link-btn" type="button" onClick={onDone}>
            Batal
          </button>
        )}
      </div>
    </form>
  );
}
