import { useState, type FormEvent } from 'react';
import { slugify } from '~/lib/activities';
import { Field, useMutation, val } from '~/lib/admin-form';
import type { CommunityGroupRow } from '~/lib/database.types';
import { deleteCommunityGroup, saveCommunityGroup, type AdminDashboard } from '~/lib/admin-data';

export function CommunityGroupsAdmin({ groups, activities }: { groups: CommunityGroupRow[]; activities: AdminDashboard['activities'] }) {
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
    const ok = await run(
      () => saveCommunityGroup(editing?.id ?? null, row),
      editing ? 'Subgrup diperbarui.' : 'Subgrup ditambahkan. Pilih sebagai penyelenggara di editor event.',
    );
    if (ok) {
      setEditing(null);
      formEl.reset();
    }
  };

  const remove = (g: CommunityGroupRow) => {
    const n = eventCount(g.id);
    if (!confirm(`Hapus subgrup "${g.name}"?${n ? ` ${n} event-nya tetap ada, tanpa penyelenggara subgrup.` : ''}`)) return;
    void run(() => deleteCommunityGroup(g.id), 'Subgrup dihapus.');
  };

  return (
    <div className="admin-grid">
      <form className="form-card" onSubmit={save} key={editing?.id ?? 'new'}>
        <h2>{editing ? 'Edit subgrup' : 'Tambah subgrup'}</h2>
        <p className="form-sub">
          Subgrup menyelenggarakan event komunitas, mis. English Club atau Fundamental. Agenda bisa difilter per subgrup.
        </p>
        {flash}
        <Field id="cg_name" label="Nama">
          <input id="cg_name" name="name" required minLength={2} maxLength={80} defaultValue={editing?.name} placeholder="English Club" />
        </Field>
        <Field id="cg_desc" label="Keterangan" optional hint="Tampil di agenda saat difilter ke subgrup ini.">
          <textarea id="cg_desc" name="description" rows={2} maxLength={300} defaultValue={editing?.description} />
        </Field>
        <Field id="cg_slug" label="Slug" optional hint="Untuk link /agenda?oleh=slug. Kosongkan = otomatis dari nama.">
          <input id="cg_slug" name="slug" defaultValue={editing?.slug} placeholder="otomatis dari nama" />
        </Field>
        <Field id="cg_order" label="Urutan" optional>
          <input id="cg_order" name="sort_order" type="number" defaultValue={editing?.sort_order ?? groups.length + 1} />
        </Field>
        <div className="inline-actions">
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {editing ? 'Simpan perubahan' : 'Simpan subgrup'}
          </button>
          {editing && (
            <button className="btn btn-ghost" type="button" onClick={() => setEditing(null)}>
              Batal
            </button>
          )}
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
                    <strong>
                      {g.sort_order}. {g.name}
                    </strong>
                    <span className="slug">
                      /agenda?oleh={g.slug} · {eventCount(g.id)} event
                    </span>
                  </div>
                  <div className="inline-actions">
                    <button className="link-btn" type="button" disabled={busy} onClick={() => setEditing(g)}>
                      Edit
                    </button>
                    <button className="link-btn" type="button" disabled={busy} onClick={() => remove(g)}>
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
