import { useState } from 'react';
import type { NextStep, RegistrationField } from '~/lib/database.types';

/**
 * Pertanyaan tambahan di form pendaftaran. Disimpan sebagai JSON lewat input
 * tersembunyi; id dipertahankan saat label diubah supaya jawaban lama tetap cocok.
 */
export function FieldsEditor({ initial }: { initial: RegistrationField[] }) {
  const [fields, setFields] = useState(initial);
  const update = (i: number, patch: Partial<RegistrationField>) =>
    setFields((list) => list.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const newId = () => {
    let n = fields.length + 1;
    while (fields.some((f) => f.id === `pertanyaan-${n}`)) n++;
    return `pertanyaan-${n}`;
  };

  return (
    <fieldset className="fields-editor">
      <legend>Pertanyaan di form pendaftaran</legend>
      <p className="form-sub">Nama, email, dan WhatsApp sudah otomatis dari profil peserta.</p>
      <input type="hidden" name="registration_fields" value={JSON.stringify(fields.filter((f) => f.label.trim()))} />
      {fields.map((f, i) => (
        <div className="fields-editor-row" key={f.id}>
          <input
            aria-label="Pertanyaan"
            value={f.label}
            maxLength={200}
            placeholder="Tulis pertanyaan"
            onChange={(e) => update(i, { label: e.target.value })}
          />
          <select
            aria-label="Jenis jawaban"
            value={f.type}
            onChange={(e) => update(i, { type: e.target.value as RegistrationField['type'] })}
          >
            <option value="text">Teks singkat</option>
            <option value="textarea">Paragraf</option>
            <option value="select">Pilihan</option>
          </select>
          <label className="check-field">
            <input type="checkbox" checked={f.required} onChange={(e) => update(i, { required: e.target.checked })} /> Wajib
          </label>
          <button className="link-btn" type="button" onClick={() => setFields((list) => list.filter((_, j) => j !== i))}>
            Hapus
          </button>
          {f.type === 'select' && (
            <input
              className="span-all"
              aria-label="Pilihan jawaban"
              placeholder="Pilihan, pisahkan dengan koma"
              defaultValue={(f.options ?? []).join(', ')}
              onChange={(e) =>
                update(i, {
                  options: e.target.value
                    .split(',')
                    .map((o) => o.trim())
                    .filter(Boolean),
                })
              }
            />
          )}
        </div>
      ))}
      {fields.length < 10 && (
        <button
          className="btn btn-ghost sm"
          type="button"
          onClick={() => setFields((list) => [...list, { id: newId(), label: '', type: 'text', required: false }])}
        >
          + Tambah pertanyaan
        </button>
      )}
    </fieldset>
  );
}

/** Langkah custom di halaman konfirmasi: judul, keterangan, link (mis. grup WA event, materi). */
export function NextStepsEditor({ initial }: { initial: NextStep[] }) {
  const [steps, setSteps] = useState(initial);
  const update = (i: number, patch: Partial<NextStep>) => setSteps((list) => list.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  return (
    <fieldset className="fields-editor">
      <legend>Langkah berikutnya (custom)</legend>
      <p className="form-sub">
        Tampil setelah langkah bawaan (simpan jadwal & link meeting). Contoh: "Gabung grup WA peserta", "Isi pre-test", "Unduh materi".
      </p>
      <input type="hidden" name="next_steps" value={JSON.stringify(steps.filter((s) => s.title.trim()))} />
      {steps.map((s, i) => (
        <div className="step-editor-row" key={i}>
          <input
            aria-label="Judul langkah"
            value={s.title}
            maxLength={120}
            placeholder="Judul, mis. Gabung grup WA peserta"
            onChange={(e) => update(i, { title: e.target.value })}
          />
          <input
            aria-label="Link"
            type="url"
            pattern="https://.*"
            value={s.url}
            placeholder="https://…"
            onChange={(e) => update(i, { url: e.target.value })}
          />
          <input
            className="span-all"
            aria-label="Keterangan"
            value={s.description}
            maxLength={300}
            placeholder="Keterangan singkat (opsional)"
            onChange={(e) => update(i, { description: e.target.value })}
          />
          <button className="link-btn" type="button" onClick={() => setSteps((list) => list.filter((_, j) => j !== i))}>
            Hapus
          </button>
        </div>
      ))}
      {steps.length < 10 && (
        <button
          className="btn btn-ghost sm"
          type="button"
          onClick={() => setSteps((list) => [...list, { title: '', url: '', description: '' }])}
        >
          + Tambah langkah
        </button>
      )}
    </fieldset>
  );
}
