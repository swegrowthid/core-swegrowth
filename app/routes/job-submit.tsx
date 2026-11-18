import { useRef, useState, type FormEvent } from 'react';
import { Link, redirect } from 'react-router';
import type { Route } from './+types/job-submit';
import { Field, todayWib } from '~/lib/admin-form';
import { requireUser } from '~/lib/auth';
import type { JobEmploymentType, JobLevel, JobRow, JobSubmitterRelation, JobWorkMode } from '~/lib/database.types';
import { parseJobMessage, parserErrorText } from '~/lib/job-parser';
import {
  EMPLOYMENT_LABEL,
  fetchIsJobPoster,
  fetchOwnerCandidates,
  fetchOwnJob,
  JOB_MANAGE_PATH,
  JOBS_PATH,
  LEVEL_LABEL,
  matchMember,
  RELATION_LABEL,
  STATUS_LABEL,
  submitJob,
  WORK_MODE_LABEL,
} from '~/lib/jobs';

export const meta: Route.MetaFunction = () => [{ title: 'Kirim loker — SWE Growth' }, { name: 'robots', content: 'noindex' }];

const DESC_MIN = 30;
const DESC_MAX = 1000;

/** ?edit=<id>: edit kiriman sendiri (member: selama pending; tim loker: kapan saja). */
export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const user = await requireUser(request);
  const editId = new URL(request.url).searchParams.get('edit');
  const isPoster = await fetchIsJobPoster();
  // Tim loker bisa menginput atas nama member yang membagikan lokernya di grup.
  const owners = isPoster ? await fetchOwnerCandidates() : [];
  if (!editId) return { editing: null, isPoster, owners };

  const data = await fetchOwnJob(editId, user.id);
  if (!data || (data.status !== 'pending' && !isPoster)) throw redirect('/portal/lokerku');
  return { editing: data, isPoster, owners };
}

type Owner = { id: string; full_name: string; handle: string };

export function HydrateFallback() {
  return <div className="loading-block">Memuat…</div>;
}

export default function JobSubmit({ loaderData: { editing, isPoster, owners } }: Route.ComponentProps) {
  return <SubmitForm key={editing?.id ?? 'new'} editing={editing} isPoster={isPoster} owners={owners} />;
}

/** "nama@x.com" jadi mailto:, URL tanpa skema jadi https://, kosong jadi null (melamar lewat CP). */
const normalizeApply = (v: string) =>
  !v
    ? null
    : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
      ? `mailto:${v}`
      : /^(https:\/\/|mailto:)/.test(v)
        ? v
        : `https://${v.replace(/^http:\/\//, '')}`;

/** Isian form yang dipakai sebagai defaultValue; diganti saat isi otomatis dari pesan WA. */
type Draft = Pick<
  JobRow,
  'title' | 'company' | 'description' | 'employment_type' | 'work_mode' | 'location' | 'salary' | 'deadline' | 'contact_name' | 'contact'
> & { apply_url: string; level: JobLevel | ''; owner_id: string };

const EMPTY_DRAFT: Draft = {
  title: '',
  company: '',
  apply_url: '',
  description: '',
  employment_type: 'full_time',
  work_mode: 'onsite',
  location: '',
  level: '',
  salary: '',
  deadline: null,
  contact_name: '',
  contact: '',
  owner_id: '',
};

// owner_id kosong = yang menginput sendiri.
const draftOf = (j: JobRow | null): Draft =>
  j
    ? {
        ...j,
        apply_url: (j.apply_url ?? '').replace(/^mailto:/, ''),
        level: j.level ?? '',
        owner_id: j.owner_id && j.owner_id !== j.submitted_by ? j.owner_id : '',
      }
    : EMPTY_DRAFT;

function readDraft(form: HTMLFormElement): Draft {
  const data = new FormData(form);
  const val = (name: string) => String(data.get(name) ?? '').trim();
  return {
    title: val('title'),
    company: val('company'),
    apply_url: val('apply_url'),
    description: val('description'),
    employment_type: val('employment_type') as JobEmploymentType,
    work_mode: val('work_mode') as JobWorkMode,
    location: val('location'),
    level: val('level') as JobLevel | '',
    salary: val('salary'),
    deadline: val('deadline') || null,
    contact_name: val('contact_name'),
    contact: val('contact'),
    owner_id: val('owner_id'),
  };
}

function SubmitForm({ editing, isPoster, owners }: { editing: JobRow | null; isPoster: boolean; owners: Owner[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [draft, setDraft] = useState(() => draftOf(editing));
  const [descLength, setDescLength] = useState(editing?.description.length ?? 0);
  // Pesan asli dari grup: bahan isi otomatis sekaligus disimpan dan bisa dibaca di kartu.
  const [message, setMessage] = useState(editing?.original_message ?? '');
  const [parsing, setParsing] = useState(false);
  const [parseNote, setParseNote] = useState<{ kind: 'success' | 'error'; text: string; missing: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [showName, setShowName] = useState(editing?.show_submitter ?? true);

  // Field yang terbaca dari pesan menimpa isian; yang kosong tetap seperti yang sudah diketik.
  const autofill = async () => {
    setParsing(true);
    setParseNote(null);
    const result = await parseJobMessage(message);
    setParsing(false);
    const failed = parserErrorText(result);
    if (failed || !result.job) {
      setParseNote({ kind: 'error', text: failed ?? 'Isi otomatis gagal. Silakan isi formulir secara manual.', missing: [] });
      return;
    }
    const current = formRef.current ? readDraft(formRef.current) : draft;
    const filled = Object.fromEntries(Object.entries(result.job).filter(([, v]) => v)) as Partial<Draft>;
    // Pengirim pesan di grup = pemilik loker, kalau namanya cocok dengan satu member.
    const sender = isPoster ? (result.sender_name ?? '') : '';
    const owner = sender ? matchMember(sender, owners) : null;
    const next = { ...current, ...filled, ...(owner && { owner_id: owner.id }) };
    setDraft(next);
    setDescLength(next.description.length);
    setFormKey((k) => k + 1);
    const ownerNote = !sender
      ? []
      : owner
        ? [`Dibagikan oleh diisi ${owner.full_name} dari nama pengirim "${sender}". Pastikan orangnya benar.`]
        : [`Pengirim "${sender}" tidak ditemukan (atau lebih dari satu) di data member. Pilih secara manual di kolom Dibagikan oleh.`];
    setParseNote({
      kind: 'success',
      text: 'Formulir terisi dari pesan. Periksa kembali sebelum dikirim.',
      missing: [...ownerNote, ...(result.missing ?? [])],
    });
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const val = (name: string) => String(form.get(name) ?? '').trim();

    if (!message.trim() && val('description').length < DESC_MIN) {
      setError(`Tulis ringkasan lowongan minimal ${DESC_MIN} karakter, atau tempel pesan asli dari grup.`);
      return;
    }
    if (!val('apply_url') && !val('contact')) {
      setError('Isi link lamaran atau kontak CP agar pelamar tahu harus menghubungi siapa.');
      return;
    }

    setBusy(true);
    setError(null);
    const { error: rpcError } = await submitJob({
      p_title: val('title'),
      p_company: val('company'),
      p_apply_url: normalizeApply(val('apply_url')),
      p_description: val('description'),
      p_employment_type: val('employment_type') as JobEmploymentType,
      p_work_mode: val('work_mode') as JobWorkMode,
      p_location: val('location'),
      p_level: (val('level') || null) as JobLevel | null,
      p_salary: val('salary'),
      p_deadline: val('deadline') || null,
      p_show_submitter: showName,
      p_submitter_relation: val('submitter_relation') as JobSubmitterRelation,
      // Bisa ditanya hanya kalau namanya tampil, supaya pembaca tahu harus menghubungi siapa.
      p_open_to_questions: showName && form.get('open_to_questions') === 'on',
      p_contact_name: val('contact_name'),
      p_contact: val('contact'),
      p_original_message: message.trim(),
      // Kosong = pemiliknya yang menginput. Diabaikan database kalau bukan tim loker.
      p_owner_id: isPoster ? val('owner_id') || null : null,
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
      <div className="portal-narrow">
        <div>
          <div className="form-card rec-done">
            <span className="check-badge" aria-hidden="true">
              ✓
            </span>
            <h1 className="page-title">{editing ? 'Perubahan tersimpan' : isPoster ? 'Loker tayang!' : 'Terima kasih telah berbagi'}</h1>
            <p className="form-sub">
              {isPoster
                ? 'Lowongan langsung tampil di daftar loker.'
                : 'Tim loker akan meninjaunya sebelum tayang. Statusnya dapat dipantau di Lokerku.'}
            </p>
            <div className="inline-actions">
              <Link className="btn btn-primary" to={isPoster ? JOBS_PATH : '/portal/lokerku'}>
                {isPoster ? 'Lihat daftar loker' : 'Lihat status di Lokerku'}
              </Link>
              {!editing && (
                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={() => {
                    setDraft(EMPTY_DRAFT);
                    setMessage('');
                    setParseNote(null);
                    setDescLength(0);
                    setShowName(true);
                    setFormKey((k) => k + 1);
                    setDone(false);
                  }}
                >
                  Bagikan lowongan lain
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-narrow">
      <div className="rec-form-wrap">
        <Link className="back" to={isPoster ? JOB_MANAGE_PATH : '/portal/lokerku'}>
          ← {isPoster ? 'Kelola loker' : 'Lokerku'}
        </Link>
        <div className="form-card job-autofill">
          <div className="field">
            <label htmlFor="j_paste">
              <b>Pesan asli dari grup</b>
              <small> (opsional)</small>
            </label>
            <textarea
              id="j_paste"
              rows={4}
              maxLength={4000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tempel pesan loker dari grup WhatsApp di sini, lalu klik Isi form dari pesan."
            />
            <small className="field-hint">Disimpan apa adanya dan bisa dibaca di kartu loker. Hapus nomor pribadi yang tidak perlu.</small>
          </div>
          <div className="inline-actions">
            <button className="btn btn-ghost sm" type="button" disabled={parsing || message.trim().length < 20} onClick={autofill}>
              {parsing ? 'Membaca pesan…' : 'Isi form dari pesan'}
            </button>
            <small className="field-hint">Dibaca AI (Gemini). Selalu periksa kembali hasilnya.</small>
          </div>
          {parseNote && (
            <div className={`form-message ${parseNote.kind}`} role="status">
              {parseNote.text}
              {parseNote.missing.length > 0 && (
                <ul>
                  {parseNote.missing.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        <form key={formKey} ref={formRef} className="form-card rec-form" onSubmit={onSubmit}>
          <h1 className="page-title">{editing ? 'Edit loker' : isPoster ? 'Tambah loker' : 'Rekomendasikan loker'}</h1>
          <p className="form-sub">
            {isPoster
              ? 'Sebagai tim loker, lowongan yang Anda tambahkan langsung tayang.'
              : 'Bagikan lowongan dari grup atau dari tempat Anda bekerja. Tim loker akan meninjaunya sebelum tayang.'}
            {editing && (
              <>
                {' '}
                Status sekarang: <b>{STATUS_LABEL[editing.status]}</b>.
              </>
            )}
          </p>

          {isPoster && (
            <Field
              id="j_owner"
              label="Dibagikan oleh"
              optional
              hint="Member SWE Growth yang membagikan loker ini di grup. Namanya tampil di kartu, dan dia bisa melihat siapa saja yang tertarik."
            >
              <select id="j_owner" name="owner_id" defaultValue={draft.owner_id}>
                <option value="">Saya sendiri</option>
                {owners.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.full_name} (@{o.handle})
                  </option>
                ))}
              </select>
            </Field>
          )}

          <Field id="j_title" label="Posisi">
            <input
              id="j_title"
              name="title"
              required
              minLength={2}
              maxLength={120}
              defaultValue={draft.title}
              placeholder="Mis. Backend Engineer (Go)"
            />
          </Field>

          <Field id="j_company" label="Perusahaan" optional hint="Kosongkan jika pesan tidak menyebut perusahaan.">
            <input id="j_company" name="company" maxLength={120} defaultValue={draft.company} />
          </Field>

          <Field
            id="j_apply"
            label="Link lamaran atau email HR"
            optional
            hint="Link resmi (LinkedIn, situs karier) atau email untuk kirim CV. Boleh kosong jika melamar lewat CP."
          >
            <input
              id="j_apply"
              name="apply_url"
              maxLength={300}
              defaultValue={draft.apply_url}
              placeholder="https://… atau hr@perusahaan.com"
            />
          </Field>

          <div className="rec-row">
            <Field id="j_cp_name" label="Nama CP" optional>
              <input id="j_cp_name" name="contact_name" maxLength={80} defaultValue={draft.contact_name} placeholder="Mis. Rina" />
            </Field>
            <Field id="j_cp" label="Kontak CP" optional>
              <input id="j_cp" name="contact" maxLength={200} defaultValue={draft.contact} placeholder="No. WA, email, atau LinkedIn" />
            </Field>
          </div>
          <p className="field-hint job-cp-hint">
            Contact person untuk pertanyaan atau pengiriman CV, biasanya yang membagikan lowongan di grup (bukan Anda, jika Anda hanya
            menginput). Kontak CP hanya terlihat oleh yang sudah login.
          </p>

          <Field
            id="j_desc"
            label="Ringkasan"
            optional={Boolean(message.trim())}
            hint={`${descLength}/${DESC_MAX} · tanggung jawab, kualifikasi utama, stack.`}
          >
            <textarea
              id="j_desc"
              name="description"
              rows={5}
              maxLength={DESC_MAX}
              defaultValue={draft.description}
              placeholder="Mis. Membangun layanan pembayaran dengan Go & PostgreSQL. Min. 2 tahun pengalaman backend."
              onChange={(e) => setDescLength(e.target.value.length)}
            />
          </Field>

          <div className="rec-row">
            <Field id="j_type" label="Tipe">
              <select id="j_type" name="employment_type" defaultValue={draft.employment_type}>
                {(Object.keys(EMPLOYMENT_LABEL) as JobEmploymentType[]).map((t) => (
                  <option key={t} value={t}>
                    {EMPLOYMENT_LABEL[t]}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="j_mode" label="Mode kerja">
              <select id="j_mode" name="work_mode" defaultValue={draft.work_mode}>
                {(Object.keys(WORK_MODE_LABEL) as JobWorkMode[]).map((m) => (
                  <option key={m} value={m}>
                    {WORK_MODE_LABEL[m]}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="j_loc" label="Kota" optional>
              <input id="j_loc" name="location" maxLength={80} defaultValue={draft.location} />
            </Field>
          </div>

          <div className="rec-row">
            <Field id="j_level" label="Level" optional>
              <select id="j_level" name="level" defaultValue={draft.level}>
                <option value="">—</option>
                {(Object.keys(LEVEL_LABEL) as JobLevel[]).map((l) => (
                  <option key={l} value={l}>
                    {LEVEL_LABEL[l]}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="j_salary" label="Gaji" optional>
              <input id="j_salary" name="salary" maxLength={80} defaultValue={draft.salary} placeholder="Mis. 10–15 jt" />
            </Field>
            <Field id="j_deadline" label="Batas lamaran" optional>
              <input id="j_deadline" name="deadline" type="date" min={todayWib()} defaultValue={draft.deadline ?? ''} />
            </Field>
          </div>

          <fieldset className="field">
            <legend>{isPoster ? 'Hubungan yang membagikan dengan lowongan ini' : 'Hubungan Anda dengan lowongan ini'}</legend>
            <div className="rec-pick" role="radiogroup">
              {(Object.keys(RELATION_LABEL) as JobSubmitterRelation[]).map((r) => (
                <label key={r}>
                  <input type="radio" name="submitter_relation" value={r} defaultChecked={(editing?.submitter_relation ?? 'share') === r} />
                  {RELATION_LABEL[r].form}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="rec-check">
            <input type="checkbox" name="show_submitter" checked={showName} onChange={(e) => setShowName(e.target.checked)} />
            {isPoster ? 'Tampilkan nama yang membagikan di daftar loker' : 'Tampilkan nama saya di daftar loker'}
          </label>
          {showName && (
            <label className="rec-check">
              <input type="checkbox" name="open_to_questions" defaultChecked={editing?.open_to_questions ?? false} />
              {isPoster ? 'Yang membagikan bersedia dihubungi mengenai lowongan ini' : 'Saya bersedia dihubungi mengenai lowongan ini'}
            </label>
          )}

          <p className="rec-rules">
            Tanpa batas lamaran, lowongan tampil 45 hari. Lowongan yang meminta biaya, deposit, atau data sensitif akan ditolak.
            Selengkapnya di <Link to="/code-of-conduct">Code of Conduct</Link>.
          </p>

          {error && <p className="form-message error">{error}</p>}
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Mengirim…' : editing ? 'Simpan perubahan' : isPoster ? 'Tayangkan loker' : 'Kirim rekomendasi'}
          </button>
        </form>
      </div>
    </div>
  );
}
