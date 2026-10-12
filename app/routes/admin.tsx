import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { Route } from './+types/admin';
import { RecommendationsAdmin } from '~/components/RecommendationsAdmin';
import { ACTIVITY_STATUSES, activityStatusLabel, organizerOf, recurrenceLabel, slugify } from '~/lib/activities';
import { Field, todayWib, useMutation, val } from '~/lib/admin-form';
import { requireAdmin, useAuth } from '~/lib/auth';
import type {
  ActivityStatus,
  CommunityGroupRow,
  MemberContributionRow,
  MemberMotivationRow,
  MembershipRow,
  ProfileRow,
  WhatsappGroupRow,
} from '~/lib/database.types';
import { formatDate, formatWibDate, formatWibTime, isoDate } from '~/lib/format';
import { experiencePeriod, MOTIVATION_QUESTIONS, seniorityLabel, sortExperiences } from '~/lib/profile';
import { MEMBERSHIP_LIVE } from '~/lib/site';
import { supabase } from '~/lib/supabase';

export const meta: Route.MetaFunction = () => [{ title: 'Admin — SWE Growth' }, { name: 'robots', content: 'noindex' }];

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  await requireAdmin(request);
  const db = supabase();

  const [profiles, memberships, motivations, activities, registrations, groups, contributions, recommendations, recommendationTopics, communityGroups] = await Promise.all([
    db.from('profiles').select('*').order('created_at', { ascending: false }),
    db.from('memberships').select('*'),
    db.from('member_motivations').select('*'),
    db.from('activities').select('*').order('created_at', { ascending: false }),
    db.from('activity_registrations').select('activity_id, status'),
    db.from('whatsapp_groups').select('*').order('sort_order').order('created_at'),
    db.from('member_contributions').select('*').order('sort_order').order('created_at'),
    db.from('recommendations').select('*').order('created_at', { ascending: false }),
    db.from('recommendation_topics').select('*').order('sort_order').order('name'),
    db.from('community_groups').select('*').order('sort_order').order('name'),
  ]);
  return {
    profiles: profiles.data ?? [],
    memberships: memberships.data ?? [],
    motivations: motivations.data ?? [],
    activities: activities.data ?? [],
    registrations: registrations.data ?? [],
    groups: groups.data ?? [],
    contributions: contributions.data ?? [],
    recommendations: recommendations.data ?? [],
    recommendationTopics: recommendationTopics.data ?? [],
    communityGroups: communityGroups.data ?? [],
  };
}

export function HydrateFallback() {
  return <div className="loading-block">Memuat admin…</div>;
}

type Tab = 'member' | 'event' | 'subgrup' | 'grup' | 'kontribusi' | 'rekomendasi';
const TABS: { id: Tab; label: string }[] = [
  { id: 'member', label: 'Member' },
  { id: 'event', label: 'Event' },
  { id: 'subgrup', label: 'Subgrup' },
  { id: 'grup', label: 'Grup WhatsApp' },
  { id: 'kontribusi', label: 'Kontribusi member' },
  { id: 'rekomendasi', label: 'Rekomendasi' },
];

export default function Admin({ loaderData }: Route.ComponentProps) {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const tab = TABS.find((t) => t.id === params.get('tab'))?.id ?? 'member';
  const pendingRecs = loaderData.recommendations.filter((r) => r.status === 'pending').length;

  return (
    <section className="block">
      <div className="wrap admin-wrap">
        <h1 className="page-title">Admin</h1>
        <p className="form-sub">Masuk sebagai {user?.email}. Perubahan langsung berlaku tanpa deploy ulang.</p>

        <nav className="member-tabs" aria-label="Bagian admin">
          {TABS.map((t) => (
            <Link key={t.id} to={t.id === 'member' ? '/admin' : `/admin?tab=${t.id}`} aria-current={tab === t.id ? 'page' : undefined}>
              {t.label}
              {t.id === 'rekomendasi' && pendingRecs > 0 && <span className="chip yellow tab-soon">{pendingRecs}</span>}
            </Link>
          ))}
        </nav>

        <div style={{ marginTop: 24 }}>
          {tab === 'member' && <MembersAdmin profiles={loaderData.profiles} memberships={loaderData.memberships} motivations={loaderData.motivations} />}
          {tab === 'event' && <ActivitiesAdmin activities={loaderData.activities} registrations={loaderData.registrations} groups={loaderData.communityGroups} />}
          {tab === 'subgrup' && <CommunityGroupsAdmin groups={loaderData.communityGroups} activities={loaderData.activities} />}
          {tab === 'grup' && <GroupsAdmin groups={loaderData.groups} />}
          {tab === 'rekomendasi' && <RecommendationsAdmin items={loaderData.recommendations} profiles={loaderData.profiles} topics={loaderData.recommendationTopics} />}
          {tab === 'kontribusi' && <ContributionsAdmin contributions={loaderData.contributions} profiles={loaderData.profiles} />}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Member
// ---------------------------------------------------------------------------

function MembersAdmin({
  profiles,
  memberships,
  motivations,
}: {
  profiles: ProfileRow[];
  memberships: MembershipRow[];
  motivations: MemberMotivationRow[];
}) {
  const { user } = useAuth();
  const { busy, run, flash } = useMutation();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<string | null>(null);

  const today = todayWib();
  const membershipOf = new Map(memberships.map((m) => [m.user_id, m]));
  const motivationOf = new Map(motivations.map((m) => [m.user_id, m]));
  const q = query.trim().toLowerCase();
  const matches = (p: ProfileRow) =>
    !q ||
    [p.full_name, p.email, p.whatsapp, p.company, p.headline, p.location, ...p.skills, ...p.tech_stack].some((v) =>
      v?.toLowerCase().includes(q),
    );

  const rows = profiles.filter(matches);
  const isActive = (p: ProfileRow) => (membershipOf.get(p.id)?.active_until ?? '') >= today;
  const pending = rows.filter((p) => !isActive(p));
  const active = rows.filter(isActive);

  const save = async (e: FormEvent<HTMLFormElement>, userId: string) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const ok = await run(
      () =>
        supabase().from('memberships').upsert({
          user_id: userId,
          active_until: val(form, 'active_until'),
          goakal_ref: val(form, 'goakal_ref') || null,
          note: val(form, 'note') || null,
          activated_by: user?.id ?? null,
          activated_at: new Date().toISOString(),
        }),
      'Membership disimpan.',
    );
    if (ok) setEditing(null);
  };

  const deactivate = (p: ProfileRow) => {
    if (!confirm(`Akhiri membership ${p.full_name || p.email} hari ini? Badge verified dan rekaman langsung tertutup.`)) return;
    const yesterday = isoDate(new Date(Date.parse(today) - 86_400_000));
    void run(() => supabase().from('memberships').update({ active_until: yesterday }).eq('user_id', p.id), 'Membership diakhiri.');
  };

  const renderRow = (p: ProfileRow) => {
    const m = membershipOf.get(p.id);
    return (
      <li key={p.id}>
        <div className="line">
          <div>
            <Link to={`/admin/member/${p.id}`}><strong>{p.full_name || '(tanpa nama)'}</strong></Link>
            {(p.headline || p.company) && <span className="muted">{[p.headline, p.company].filter(Boolean).join(' · ')}</span>}
            <span className="slug">{[p.email, p.whatsapp].filter(Boolean).join(' · ')}</span>
            {p.tech_stack.length > 0 && <span className="slug">{p.tech_stack.join(', ')}</span>}
            <span className="slug">
              {!MEMBERSHIP_LIVE
                ? `${motivationOf.has(p.id) && p.onboarded_at ? 'onboarding selesai' : 'belum selesai onboarding'} · daftar ${formatDate(p.created_at)}`
                : m
                  ? `${m.active_until >= today ? 'aktif sampai' : 'berakhir'} ${formatDate(m.active_until)}${m.goakal_ref ? ` · ${m.goakal_ref}` : ''}`
                  : p.onboarded_at ? 'belum aktif' : 'belum isi data'}
            </span>
          </div>
          {MEMBERSHIP_LIVE && <div className="inline-actions">
            <button className="btn btn-ghost sm" type="button" onClick={() => setEditing(editing === p.id ? null : p.id)}>
              {m && m.active_until >= today ? 'Ubah' : m ? 'Perpanjang' : 'Aktifkan'}
            </button>
            {m && m.active_until >= today && (
              <button className="link-btn" type="button" disabled={busy} onClick={() => deactivate(p)}>Akhiri</button>
            )}
          </div>}
        </div>
        {MEMBERSHIP_LIVE && editing === p.id && (
          <form className="inline-form" onSubmit={(e) => save(e, p.id)}>
            <Field id={`until-${p.id}`} label="Aktif sampai">
              <input id={`until-${p.id}`} name="active_until" type="date" required min={today} defaultValue={m && m.active_until >= today ? m.active_until : ''} />
            </Field>
            <Field id={`ref-${p.id}`} label="Ref. goakal" optional>
              <input id={`ref-${p.id}`} name="goakal_ref" maxLength={120} defaultValue={m?.goakal_ref ?? ''} placeholder="No. order / invoice" />
            </Field>
            <Field id={`note-${p.id}`} label="Catatan" optional>
              <input id={`note-${p.id}`} name="note" maxLength={500} defaultValue={m?.note ?? ''} />
            </Field>
            <button className="btn btn-primary sm" type="submit" disabled={busy}>Simpan</button>
          </form>
        )}
      </li>
    );
  };

  return (
    <div className="admin-stack">
      <div className="line admin-toolbar">
        <div className="field" style={{ maxWidth: 420, flex: 1 }}>
          <label htmlFor="member-search">Cari nama, email, WhatsApp, keahlian, atau teknologi</label>
          <input id="member-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <button className="btn btn-ghost sm" type="button" onClick={() => downloadMembersCsv(rows, membershipOf, motivationOf)}>
          Unduh CSV ({rows.length})
        </button>
      </div>
      {flash}
      {!MEMBERSHIP_LIVE ? (
        <div className="panel">
          <h2>Member ({rows.length})</h2>
          {rows.length === 0 ? <p className="muted">Tidak ada.</p> : <ul className="admin-list">{rows.map(renderRow)}</ul>}
        </div>
      ) : (<>
      <div className="panel">
        <h2>Belum aktif ({pending.length})</h2>
        <p className="form-sub">Akun yang sudah login tapi belum punya membership aktif. Cocokkan dengan pembayaran di goakal.</p>
        {pending.length === 0 ? <p className="muted">Tidak ada.</p> : <ul className="admin-list">{pending.map(renderRow)}</ul>}
      </div>
      <div className="panel">
        <h2>Member aktif ({active.length})</h2>
        {active.length === 0 ? <p className="muted">Belum ada.</p> : <ul className="admin-list">{active.map(renderRow)}</ul>}
      </div>
      </>)}
    </div>
  );
}

const csvCell = (v: string | number | null | undefined) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Data member (hasil pencarian saat ini) sebagai CSV — bisa dibuka di Excel / Google Sheets. */
function downloadMembersCsv(
  rows: ProfileRow[],
  membershipOf: Map<string, MembershipRow>,
  motivationOf: Map<string, MemberMotivationRow>,
) {
  const header = [
    'Nama', 'Email', 'WhatsApp', 'Domisili', 'Peran', 'Perusahaan', 'Level', 'Tahun pengalaman',
    'LinkedIn', 'GitHub', 'Portfolio', 'Keahlian', 'Teknologi', 'Pengalaman',
    'Masalah karier', 'Yang bisa membantu', 'Alasan bergabung', 'Harapan', 'Membership sampai', 'Bergabung',
  ];
  const lines = rows.map((p) =>
    [
      p.full_name, p.email, p.whatsapp, p.location, p.headline, p.company,
      p.seniority && seniorityLabel[p.seniority], p.years_experience,
      p.linkedin_url, p.github_url, p.portfolio_url,
      p.skills.join(', '), p.tech_stack.join(', '),
      sortExperiences(p.experiences).map((e) => `${e.role} @ ${e.company} (${experiencePeriod(e)})`).join('; '),
      ...MOTIVATION_QUESTIONS.map((q) => motivationOf.get(p.id)?.[q.name]),
      membershipOf.get(p.id)?.active_until, isoDate(new Date(p.created_at)),
    ].map(csvCell).join(','),
  );
  // BOM supaya Excel membaca UTF-8 dengan benar.
  const blob = new Blob(['\uFEFF' + [header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `member-swegrowth-${todayWib()}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ---------------------------------------------------------------------------
// Event
// ---------------------------------------------------------------------------

type Activities = Route.ComponentProps['loaderData']['activities'];
type RegistrationSummary = Route.ComponentProps['loaderData']['registrations'];

/** Daftar event + statistik singkat; edit lengkap di /admin/event/:id. */
function ActivitiesAdmin({ activities, registrations, groups }: { activities: Activities; registrations: RegistrationSummary; groups: CommunityGroupRow[] }) {
  const { busy, run, flash } = useMutation();
  const countOf = (id: string, status: string) => registrations.filter((r) => r.activity_id === id && r.status === status).length;

  return (
    <div className="admin-stack">
      <div className="line admin-toolbar">
        <p className="form-sub" style={{ margin: 0 }}>Setiap event punya halaman publik /agenda/slug untuk dibagikan.</p>
        <Link className="btn btn-primary sm" to="/admin/event/baru">+ Tambah event</Link>
      </div>
      {flash}
      <div className="panel">
        <h2>Event ({activities.length})</h2>
        {activities.length === 0 ? (
          <p className="form-sub">Belum ada event.</p>
        ) : (
          <ul className="admin-list">
            {activities.map((a) => {
              const confirmed = countOf(a.id, 'confirmed');
              const waitlisted = countOf(a.id, 'waitlisted');
              return (
                <li key={a.id}>
                  <div className="line">
                    <div>
                      <Link to={`/admin/event/${a.id}`}><strong>{a.title}</strong></Link>
                      <span className="slug">
                        {[
                          a.starts_at ? `${formatWibDate(a.starts_at)} ${formatWibTime(a.starts_at)}` : 'jadwal belum diisi',
                          recurrenceLabel(a)?.toLowerCase(),
                          organizerOf(a, groups) && `oleh ${organizerOf(a, groups)!.name}`,
                          a.photos.length > 0 && `${a.photos.length} foto`,
                          a.price_idr > 0 ? `Rp${a.price_idr.toLocaleString('id-ID')}` : 'gratis',
                          !a.is_public && 'disembunyikan',
                        ].filter(Boolean).join(' · ')}
                      </span>
                      <span className="slug">
                        {confirmed} terdaftar{a.capacity ? ` / ${a.capacity} kursi` : ''}{waitlisted ? ` · ${waitlisted} waitlist` : ''}
                      </span>
                    </div>
                    <div className="inline-actions">
                      <select
                        aria-label={`Status ${a.title}`}
                        value={a.status}
                        disabled={busy}
                        onChange={(e) =>
                          run(() => supabase().from('activities').update({ status: e.target.value as ActivityStatus }).eq('id', a.id), `Status "${a.title}" diperbarui.`)
                        }
                      >
                        {ACTIVITY_STATUSES.map((st) => <option key={st} value={st}>{activityStatusLabel[st]}</option>)}
                      </select>
                      <Link className="btn btn-ghost sm" to={`/admin/event/${a.id}`}>Edit</Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
// ---------------------------------------------------------------------------
// Subgrup komunitas (penyelenggara event)
// ---------------------------------------------------------------------------

function CommunityGroupsAdmin({ groups, activities }: { groups: CommunityGroupRow[]; activities: Activities }) {
  const { busy, run, flash } = useMutation();
  const [editing, setEditing] = useState<CommunityGroupRow | null>(null);
  const eventCount = (id: string) => activities.filter((a) => a.organizer_group_id === id).length;

  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const name = val(form, 'name');
    const row = {
      name,
      slug: slugify(val(form, 'slug') || name),
      description: val(form, 'description'),
      sort_order: Number.parseInt(val(form, 'sort_order') || '0', 10),
    };
    const ok = editing
      ? await run(() => supabase().from('community_groups').update(row).eq('id', editing.id), 'Subgrup diperbarui.')
      : await run(() => supabase().from('community_groups').insert(row), 'Subgrup ditambahkan. Pilih sebagai penyelenggara di editor event.');
    if (ok) {
      setEditing(null);
      formEl.reset();
    }
  };

  const remove = (g: CommunityGroupRow) => {
    const n = eventCount(g.id);
    if (!confirm(`Hapus subgrup "${g.name}"?${n ? ` ${n} event-nya tetap ada, tanpa penyelenggara subgrup.` : ''}`)) return;
    void run(() => supabase().from('community_groups').delete().eq('id', g.id), 'Subgrup dihapus.');
  };

  return (
    <div className="admin-grid">
      <form className="form-card" onSubmit={save} key={editing?.id ?? 'new'}>
        <h2>{editing ? 'Edit subgrup' : 'Tambah subgrup'}</h2>
        <p className="form-sub">Subgrup menyelenggarakan event komunitas, mis. English Club atau Fundamental. Agenda bisa difilter per subgrup.</p>
        {flash}
        <Field id="cg_name" label="Nama"><input id="cg_name" name="name" required minLength={2} maxLength={80} defaultValue={editing?.name} placeholder="English Club" /></Field>
        <Field id="cg_desc" label="Keterangan" optional hint="Tampil di agenda saat difilter ke subgrup ini.">
          <textarea id="cg_desc" name="description" rows={2} maxLength={300} defaultValue={editing?.description} />
        </Field>
        <Field id="cg_slug" label="Slug" optional hint="Untuk link /agenda?oleh=slug. Kosongkan = otomatis dari nama.">
          <input id="cg_slug" name="slug" defaultValue={editing?.slug} placeholder="otomatis dari nama" />
        </Field>
        <Field id="cg_order" label="Urutan" optional><input id="cg_order" name="sort_order" type="number" defaultValue={editing?.sort_order ?? groups.length + 1} /></Field>
        <div className="inline-actions">
          <button className="btn btn-primary" type="submit" disabled={busy}>{editing ? 'Simpan perubahan' : 'Simpan subgrup'}</button>
          {editing && <button className="btn btn-ghost" type="button" onClick={() => setEditing(null)}>Batal</button>}
        </div>
      </form>

      <div className="panel">
        <h2>Subgrup</h2>
        {groups.length === 0 ? (
          <p className="form-sub">Belum ada subgrup. Event tanpa subgrup tampil sebagai kegiatan SWE Growth.</p>
        ) : (
          <ul className="admin-list">
            {groups.map((g) => (
              <li key={g.id}>
                <div className="line">
                  <div>
                    <strong>{g.sort_order}. {g.name}</strong>
                    <span className="slug">/agenda?oleh={g.slug} · {eventCount(g.id)} event</span>
                  </div>
                  <div className="inline-actions">
                    <button className="link-btn" type="button" disabled={busy} onClick={() => setEditing(g)}>Edit</button>
                    <button className="link-btn" type="button" disabled={busy} onClick={() => remove(g)}>Hapus</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function GroupsAdmin({ groups }: { groups: WhatsappGroupRow[] }) {
  const { busy, run, flash } = useMutation();

  const create = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const ok = await run(
      () =>
        supabase().from('whatsapp_groups').insert({
          name: val(form, 'name'),
          description: val(form, 'description'),
          invite_url: val(form, 'invite_url'),
          sort_order: Number.parseInt(val(form, 'sort_order') || '0', 10),
        }),
      'Grup ditambahkan. Langsung terlihat di portal member.',
    );
    if (ok) formEl.reset();
  };

  const remove = (g: WhatsappGroupRow) => {
    if (!confirm(`Hapus grup "${g.name}" dari portal?`)) return;
    void run(() => supabase().from('whatsapp_groups').delete().eq('id', g.id), 'Grup dihapus dari portal.');
  };

  return (
    <div className="admin-grid">
      <form className="form-card" onSubmit={create}>
        <h2>Tambah grup</h2>
        <p className="form-sub">Link invite hanya terlihat oleh member aktif.</p>
        {flash}
        <Field id="g_name" label="Nama grup"><input id="g_name" name="name" required minLength={2} maxLength={80} /></Field>
        <Field id="g_desc" label="Keterangan" optional><input id="g_desc" name="description" maxLength={300} /></Field>
        <Field id="g_url" label="Link invite"><input id="g_url" name="invite_url" type="url" required pattern="https://.*" placeholder="https://chat.whatsapp.com/…" /></Field>
        <Field id="g_order" label="Urutan" optional><input id="g_order" name="sort_order" type="number" defaultValue={groups.length + 1} /></Field>
        <button className="btn btn-primary" type="submit" disabled={busy}>Simpan grup</button>
      </form>

      <div className="panel">
        <h2>Grup di portal</h2>
        {groups.length === 0 ? (
          <p className="form-sub">Belum ada grup.</p>
        ) : (
          <ul className="admin-list">
            {groups.map((g) => (
              <li key={g.id}>
                <div className="line">
                  <div>
                    <strong>{g.sort_order}. {g.name}</strong>
                    <span className="slug">{g.invite_url}</span>
                  </div>
                  <button className="link-btn" type="button" disabled={busy} onClick={() => remove(g)}>Hapus</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Kontribusi member (section "Dari member ke member" di landing)
// ---------------------------------------------------------------------------

function ContributionsAdmin({ contributions, profiles }: { contributions: MemberContributionRow[]; profiles: ProfileRow[] }) {
  const { busy, run, flash } = useMutation();
  const [editing, setEditing] = useState<MemberContributionRow | null>(null);
  const members = profiles.filter((p) => p.full_name).sort((a, b) => a.full_name.localeCompare(b.full_name));
  const memberName = new Map(profiles.map((p) => [p.id, p.full_name || p.email || '(tanpa nama)']));

  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const row = {
      title: val(form, 'title'),
      category: val(form, 'category'),
      description: val(form, 'description'),
      url: val(form, 'url'),
      maker_name: val(form, 'maker_name'),
      maker_id: val(form, 'maker_id') || null,
      icon_url: val(form, 'icon_url') || null,
      sort_order: Number.parseInt(val(form, 'sort_order') || '0', 10),
    };
    const ok = editing
      ? await run(() => supabase().from('member_contributions').update(row).eq('id', editing.id), 'Kontribusi diperbarui.')
      : await run(() => supabase().from('member_contributions').insert(row), 'Kontribusi ditambahkan. Langsung tampil di landing.');
    if (ok) {
      setEditing(null);
      formEl.reset();
    }
  };

  const togglePublish = (c: MemberContributionRow) =>
    run(
      () => supabase().from('member_contributions').update({ is_published: !c.is_published }).eq('id', c.id),
      c.is_published ? `"${c.title}" disembunyikan dari landing.` : `"${c.title}" tampil di landing.`,
    );

  const remove = (c: MemberContributionRow) => {
    if (!confirm(`Hapus kontribusi "${c.title}"?`)) return;
    void run(() => supabase().from('member_contributions').delete().eq('id', c.id), 'Kontribusi dihapus.');
  };

  return (
    <div className="admin-grid">
      {/* key: form diisi ulang setiap ganti item yang diedit */}
      <form className="form-card" onSubmit={save} key={editing?.id ?? 'new'}>
        <h2>{editing ? 'Edit kontribusi' : 'Tambah kontribusi'}</h2>
        <p className="form-sub">Tampil di section "Dari member ke member" di landing page.</p>
        {flash}
        <Field id="c_title" label="Nama"><input id="c_title" name="title" required minLength={2} maxLength={80} defaultValue={editing?.title} /></Field>
        <Field id="c_category" label="Jenis" optional hint="Mis. Web dokumentasi, Bot komunitas, Repo"><input id="c_category" name="category" maxLength={40} defaultValue={editing?.category} /></Field>
        <Field id="c_desc" label="Deskripsi singkat" optional><textarea id="c_desc" name="description" rows={3} maxLength={300} defaultValue={editing?.description} /></Field>
        <Field id="c_url" label="Link"><input id="c_url" name="url" type="url" required pattern="https://.*" placeholder="https://…" defaultValue={editing?.url} /></Field>
        <Field id="c_member" label="Dibuat oleh member" optional hint="Nama di landing jadi link ke profil publiknya.">
          <select id="c_member" name="maker_id" defaultValue={editing?.maker_id ?? ''}>
            <option value="">Bukan member terdaftar</option>
            {members.map((p) => <option key={p.id} value={p.id}>{p.full_name}{p.email ? ` (${p.email})` : ''}</option>)}
          </select>
        </Field>
        <Field id="c_maker" label="Nama pembuat (bukan member)" optional hint="Dipakai kalau member di atas tidak dipilih."><input id="c_maker" name="maker_name" maxLength={80} defaultValue={editing?.maker_name} /></Field>
        <Field id="c_icon" label="Link logo/ikon" optional hint="Gambar persegi. Kosongkan untuk pakai huruf awal."><input id="c_icon" name="icon_url" type="url" pattern="https://.*" defaultValue={editing?.icon_url ?? ''} /></Field>
        <Field id="c_order" label="Urutan" optional><input id="c_order" name="sort_order" type="number" defaultValue={editing?.sort_order ?? contributions.length + 1} /></Field>
        <div className="inline-actions">
          <button className="btn btn-primary" type="submit" disabled={busy}>{editing ? 'Simpan perubahan' : 'Simpan kontribusi'}</button>
          {editing && <button className="btn btn-ghost" type="button" onClick={() => setEditing(null)}>Batal</button>}
        </div>
      </form>

      <div className="panel">
        <h2>Kontribusi</h2>
        {contributions.length === 0 ? (
          <p className="form-sub">Belum ada kontribusi. Section-nya tersembunyi di landing sampai ada yang tampil.</p>
        ) : (
          <ul className="admin-list">
            {contributions.map((c) => (
              <li key={c.id}>
                <div className="line">
                  <div>
                    <strong>{c.sort_order}. {c.title}</strong>
                    <span className="slug">{[c.category, (c.maker_id ? memberName.get(c.maker_id) : c.maker_name) && `oleh ${c.maker_id ? memberName.get(c.maker_id) : c.maker_name}`, !c.is_published && 'disembunyikan'].filter(Boolean).join(' · ')}</span>
                    <span className="slug">{c.url}</span>
                  </div>
                  <div className="inline-actions">
                    <button className="link-btn" type="button" disabled={busy} onClick={() => setEditing(c)}>Edit</button>
                    <button className="link-btn" type="button" disabled={busy} onClick={() => togglePublish(c)}>{c.is_published ? 'Sembunyikan' : 'Tampilkan'}</button>
                    <button className="link-btn" type="button" disabled={busy} onClick={() => remove(c)}>Hapus</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
