import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Field, todayWib, useMutation, val } from '~/lib/admin-form';
import { useAuth } from '~/lib/auth';
import type { MemberMotivationRow, MembershipRow, ProfileRow } from '~/lib/database.types';
import { formatDate, isoDate } from '~/lib/format';
import { experiencePeriod, MOTIVATION_QUESTIONS, seniorityLabel, sortExperiences } from '~/lib/profile';
import { MEMBERSHIP_LIVE } from '~/lib/site';
import { endMembership, saveMembership } from '~/lib/admin-data';

export function MembersAdmin({
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
        saveMembership({
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
    void run(() => endMembership(p.id, yesterday), 'Membership diakhiri.');
  };

  const renderRow = (p: ProfileRow) => {
    const m = membershipOf.get(p.id);
    return (
      <li key={p.id}>
        <div className="line">
          <div>
            <Link to={`/admin/member/${p.id}`}>
              <strong>{p.full_name || '(tanpa nama)'}</strong>
            </Link>
            {(p.headline || p.company) && <span className="muted">{[p.headline, p.company].filter(Boolean).join(' · ')}</span>}
            <span className="slug">{[p.email, p.whatsapp].filter(Boolean).join(' · ')}</span>
            {p.tech_stack.length > 0 && <span className="slug">{p.tech_stack.join(', ')}</span>}
            <span className="slug">
              {!MEMBERSHIP_LIVE
                ? `${motivationOf.has(p.id) && p.onboarded_at ? 'onboarding selesai' : 'belum selesai onboarding'} · daftar ${formatDate(p.created_at)}`
                : m
                  ? `${m.active_until >= today ? 'aktif sampai' : 'berakhir'} ${formatDate(m.active_until)}${m.goakal_ref ? ` · ${m.goakal_ref}` : ''}`
                  : p.onboarded_at
                    ? 'belum aktif'
                    : 'belum isi data'}
            </span>
          </div>
          {MEMBERSHIP_LIVE && (
            <div className="inline-actions">
              <button className="btn btn-ghost sm" type="button" onClick={() => setEditing(editing === p.id ? null : p.id)}>
                {m && m.active_until >= today ? 'Ubah' : m ? 'Perpanjang' : 'Aktifkan'}
              </button>
              {m && m.active_until >= today && (
                <button className="link-btn" type="button" disabled={busy} onClick={() => deactivate(p)}>
                  Akhiri
                </button>
              )}
            </div>
          )}
        </div>
        {MEMBERSHIP_LIVE && editing === p.id && (
          <form className="inline-form" onSubmit={(e) => save(e, p.id)}>
            <Field id={`until-${p.id}`} label="Aktif sampai">
              <input
                id={`until-${p.id}`}
                name="active_until"
                type="date"
                required
                min={today}
                defaultValue={m && m.active_until >= today ? m.active_until : ''}
              />
            </Field>
            <Field id={`ref-${p.id}`} label="Ref. goakal" optional>
              <input
                id={`ref-${p.id}`}
                name="goakal_ref"
                maxLength={120}
                defaultValue={m?.goakal_ref ?? ''}
                placeholder="No. order / invoice"
              />
            </Field>
            <Field id={`note-${p.id}`} label="Catatan" optional>
              <input id={`note-${p.id}`} name="note" maxLength={500} defaultValue={m?.note ?? ''} />
            </Field>
            <button className="btn btn-primary sm" type="submit" disabled={busy}>
              Simpan
            </button>
          </form>
        )}
      </li>
    );
  };

  return (
    <div className="admin-stack">
      <div className="line admin-toolbar">
        <div className="field search-field">
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
      ) : (
        <>
          <div className="panel">
            <h2>Belum aktif ({pending.length})</h2>
            <p className="form-sub">Akun yang sudah login tapi belum punya membership aktif. Cocokkan dengan pembayaran di goakal.</p>
            {pending.length === 0 ? <p className="muted">Tidak ada.</p> : <ul className="admin-list">{pending.map(renderRow)}</ul>}
          </div>
          <div className="panel">
            <h2>Member aktif ({active.length})</h2>
            {active.length === 0 ? <p className="muted">Belum ada.</p> : <ul className="admin-list">{active.map(renderRow)}</ul>}
          </div>
        </>
      )}
    </div>
  );
}

export const csvCell = (v: string | number | null | undefined) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Data member (hasil pencarian saat ini) sebagai CSV — bisa dibuka di Excel / Google Sheets. */
export function downloadMembersCsv(
  rows: ProfileRow[],
  membershipOf: Map<string, MembershipRow>,
  motivationOf: Map<string, MemberMotivationRow>,
) {
  const header = [
    'Nama',
    'Email',
    'WhatsApp',
    'Domisili',
    'Peran',
    'Perusahaan',
    'Level',
    'Tahun pengalaman',
    'LinkedIn',
    'GitHub',
    'Portfolio',
    'Keahlian',
    'Teknologi',
    'Pengalaman',
    'Masalah karier',
    'Yang bisa membantu',
    'Alasan bergabung',
    'Harapan',
    'Membership sampai',
    'Bergabung',
  ];
  const lines = rows.map((p) =>
    [
      p.full_name,
      p.email,
      p.whatsapp,
      p.location,
      p.headline,
      p.company,
      p.seniority && seniorityLabel[p.seniority],
      p.years_experience,
      p.linkedin_url,
      p.github_url,
      p.portfolio_url,
      p.skills.join(', '),
      p.tech_stack.join(', '),
      sortExperiences(p.experiences)
        .map((e) => `${e.role} @ ${e.company} (${experiencePeriod(e)})`)
        .join('; '),
      ...MOTIVATION_QUESTIONS.map((q) => motivationOf.get(p.id)?.[q.name]),
      membershipOf.get(p.id)?.active_until,
      isoDate(new Date(p.created_at)),
    ]
      .map(csvCell)
      .join(','),
  );
  // BOM supaya Excel membaca UTF-8 dengan benar.
  const blob = new Blob(['\uFEFF' + [header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `member-swegrowth-${todayWib()}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
