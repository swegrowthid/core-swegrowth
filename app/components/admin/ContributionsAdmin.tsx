import { useState, type FormEvent } from 'react';
import { Field, useMutation, val } from '~/lib/admin-form';
import type { MemberContributionRow, ProfileRow } from '~/lib/database.types';
import { deleteContribution, saveContribution, setContributionPublished } from '~/lib/admin-data';

export function ContributionsAdmin({ contributions, profiles }: { contributions: MemberContributionRow[]; profiles: ProfileRow[] }) {
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
    const ok = await run(
      () => saveContribution(editing?.id ?? null, row),
      editing ? 'Kontribusi diperbarui.' : 'Kontribusi ditambahkan. Langsung tampil di landing.',
    );
    if (ok) {
      setEditing(null);
      formEl.reset();
    }
  };

  const togglePublish = (c: MemberContributionRow) =>
    run(
      () => setContributionPublished(c.id, !c.is_published),
      c.is_published ? `"${c.title}" disembunyikan dari landing.` : `"${c.title}" tampil di landing.`,
    );

  const remove = (c: MemberContributionRow) => {
    if (!confirm(`Hapus kontribusi "${c.title}"?`)) return;
    void run(() => deleteContribution(c.id), 'Kontribusi dihapus.');
  };

  return (
    <div className="admin-grid">
      {/* key: form diisi ulang setiap ganti item yang diedit */}
      <form className="form-card" onSubmit={save} key={editing?.id ?? 'new'}>
        <h2>{editing ? 'Edit kontribusi' : 'Tambah kontribusi'}</h2>
        <p className="form-sub">Tampil di section "Dari member ke member" di landing page.</p>
        {flash}
        <Field id="c_title" label="Nama">
          <input id="c_title" name="title" required minLength={2} maxLength={80} defaultValue={editing?.title} />
        </Field>
        <Field id="c_category" label="Jenis" optional hint="Mis. Web dokumentasi, Bot komunitas, Repo">
          <input id="c_category" name="category" maxLength={40} defaultValue={editing?.category} />
        </Field>
        <Field id="c_desc" label="Deskripsi singkat" optional>
          <textarea id="c_desc" name="description" rows={3} maxLength={300} defaultValue={editing?.description} />
        </Field>
        <Field id="c_url" label="Link">
          <input id="c_url" name="url" type="url" required pattern="https://.*" placeholder="https://…" defaultValue={editing?.url} />
        </Field>
        <Field id="c_member" label="Dibuat oleh member" optional hint="Nama di landing jadi link ke profil publiknya.">
          <select id="c_member" name="maker_id" defaultValue={editing?.maker_id ?? ''}>
            <option value="">Bukan member terdaftar</option>
            {members.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
                {p.email ? ` (${p.email})` : ''}
              </option>
            ))}
          </select>
        </Field>
        <Field id="c_maker" label="Nama pembuat (bukan member)" optional hint="Dipakai kalau member di atas tidak dipilih.">
          <input id="c_maker" name="maker_name" maxLength={80} defaultValue={editing?.maker_name} />
        </Field>
        <Field id="c_icon" label="Link logo/ikon" optional hint="Gambar persegi. Kosongkan untuk pakai huruf awal.">
          <input id="c_icon" name="icon_url" type="url" pattern="https://.*" defaultValue={editing?.icon_url ?? ''} />
        </Field>
        <Field id="c_order" label="Urutan" optional>
          <input id="c_order" name="sort_order" type="number" defaultValue={editing?.sort_order ?? contributions.length + 1} />
        </Field>
        <div className="inline-actions">
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {editing ? 'Simpan perubahan' : 'Simpan kontribusi'}
          </button>
          {editing && (
            <button className="btn btn-ghost" type="button" onClick={() => setEditing(null)}>
              Batal
            </button>
          )}
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
                    <strong>
                      {c.sort_order}. {c.title}
                    </strong>
                    <span className="slug">
                      {[
                        c.category,
                        (c.maker_id ? memberName.get(c.maker_id) : c.maker_name) &&
                          `oleh ${c.maker_id ? memberName.get(c.maker_id) : c.maker_name}`,
                        !c.is_published && 'disembunyikan',
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                    <span className="slug">{c.url}</span>
                  </div>
                  <div className="inline-actions">
                    <button className="link-btn" type="button" disabled={busy} onClick={() => setEditing(c)}>
                      Edit
                    </button>
                    <button className="link-btn" type="button" disabled={busy} onClick={() => togglePublish(c)}>
                      {c.is_published ? 'Sembunyikan' : 'Tampilkan'}
                    </button>
                    <button className="link-btn" type="button" disabled={busy} onClick={() => remove(c)}>
                      Hapus
                    </button>
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
