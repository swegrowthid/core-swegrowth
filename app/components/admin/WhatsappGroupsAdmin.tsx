import { type FormEvent } from 'react';
import { Field, useMutation, val } from '~/lib/admin-form';
import type { WhatsappGroupRow } from '~/lib/database.types';
import { addWhatsappGroup, deleteWhatsappGroup } from '~/lib/admin-data';

export function WhatsappGroupsAdmin({ groups }: { groups: WhatsappGroupRow[] }) {
  const { busy, run, flash } = useMutation();

  const create = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const ok = await run(
      () =>
        addWhatsappGroup({
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
    void run(() => deleteWhatsappGroup(g.id), 'Grup dihapus dari portal.');
  };

  return (
    <div className="admin-grid">
      <form className="form-card" onSubmit={create}>
        <h2>Tambah grup</h2>
        <p className="form-sub">Link invite hanya terlihat oleh member aktif.</p>
        {flash}
        <Field id="g_name" label="Nama grup">
          <input id="g_name" name="name" required minLength={2} maxLength={80} />
        </Field>
        <Field id="g_desc" label="Keterangan" optional>
          <input id="g_desc" name="description" maxLength={300} />
        </Field>
        <Field id="g_url" label="Link invite">
          <input id="g_url" name="invite_url" type="url" required pattern="https://.*" placeholder="https://chat.whatsapp.com/…" />
        </Field>
        <Field id="g_order" label="Urutan" optional>
          <input id="g_order" name="sort_order" type="number" defaultValue={groups.length + 1} />
        </Field>
        <button className="btn btn-primary" type="submit" disabled={busy}>
          Simpan grup
        </button>
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
                    <strong>
                      {g.sort_order}. {g.name}
                    </strong>
                    <span className="slug">{g.invite_url}</span>
                  </div>
                  <button className="link-btn" type="button" disabled={busy} onClick={() => remove(g)}>
                    Hapus
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
