import { useState, type FormEvent } from 'react';
import { Link, redirect } from 'react-router';
import type { Route } from './+types/job-submit';
import { Field, todayWib } from '~/lib/admin-form';
import { requireUser } from '~/lib/auth';
import type { JobEmploymentType, JobLevel, JobRow, JobSubmitterRelation, JobWorkMode } from '~/lib/database.types';
import {
  EMPLOYMENT_LABEL,
  fetchIsJobPoster,
  fetchOwnJob,
  JOB_MANAGE_PATH,
  JOBS_PATH,
  LEVEL_LABEL,
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
  if (!editId) return { editing: null, isPoster };

  const data = await fetchOwnJob(editId, user.id);
  if (!data || (data.status !== 'pending' && !isPoster)) throw redirect('/portal');
  return { editing: data, isPoster };
}

export function HydrateFallback() {
  return <div className="loading-block">Memuat…</div>;
}

export default function JobSubmit({ loaderData: { editing, isPoster } }: Route.ComponentProps) {
  return <SubmitForm key={editing?.id ?? 'new'} editing={editing} isPoster={isPoster} />;
}

/** "nama@x.com" jadi mailto:, URL tanpa skema jadi https://. */
const normalizeApply = (v: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? `mailto:${v}` : /^(https:\/\/|mailto:)/.test(v) ? v : `https://${v.replace(/^http:\/\//, '')}`;

function SubmitForm({ editing, isPoster }: { editing: JobRow | null; isPoster: boolean }) {
  const [descLength, setDescLength] = useState(editing?.description.length ?? 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [showName, setShowName] = useState(editing?.show_submitter ?? true);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const val = (name: string) => String(form.get(name) ?? '').trim();

    if (val('description').length < DESC_MIN) {
      setError(`Tulis ringkasan lowongannya minimal ${DESC_MIN} karakter, ya.`);
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
            <h1 className="page-title">{editing ? 'Perubahan tersimpan' : isPoster ? 'Loker tayang!' : 'Makasih udah berbagi!'}</h1>
            <p className="form-sub">
              {isPoster
                ? 'Lokernya langsung tampil di direktori.'
                : 'Tim loker cek dulu sebelum tayang di direktori. Statusnya bisa kamu pantau di portal.'}
            </p>
            <div className="inline-actions">
              <Link className="btn btn-primary" to={isPoster ? JOBS_PATH : '/portal#lokerku'}>
                {isPoster ? 'Lihat direktori' : 'Lihat status di portal'}
              </Link>
              {!editing && (
                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={() => {
                    setDescLength(0);
                    setShowName(true);
                    setFormKey((k) => k + 1);
                    setDone(false);
                  }}
                >
                  Kirim loker lain
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
        <Link className="back" to={isPoster ? JOB_MANAGE_PATH : JOBS_PATH}>
          ← {isPoster ? 'Kelola loker' : 'Loker'}
        </Link>
        <form key={formKey} className="form-card rec-form" onSubmit={onSubmit}>
          <h1 className="page-title">{editing ? 'Edit loker' : isPoster ? 'Tambah loker' : 'Rekomendasikan loker'}</h1>
          <p className="form-sub">
            {isPoster
              ? 'Kamu tim loker, jadi loker ini langsung tayang.'
              : 'Lihat loker bagus di grup atau di kantormu? Tim loker cek dulu sebelum tayang.'}
            {editing && (
              <>
                {' '}
                Status sekarang: <b>{STATUS_LABEL[editing.status]}</b>.
              </>
            )}
          </p>

          <Field id="j_title" label="Posisi">
            <input
              id="j_title"
              name="title"
              required
              minLength={2}
              maxLength={120}
              defaultValue={editing?.title}
              placeholder="Mis. Backend Engineer (Go)"
            />
          </Field>

          <Field id="j_company" label="Perusahaan">
            <input id="j_company" name="company" required maxLength={120} defaultValue={editing?.company} />
          </Field>

          <Field id="j_apply" label="Link lamaran atau email HR" hint="Link resmi (LinkedIn, situs karier) atau email untuk kirim CV.">
            <input
              id="j_apply"
              name="apply_url"
              required
              maxLength={300}
              defaultValue={editing?.apply_url.replace(/^mailto:/, '')}
              placeholder="https://… atau hr@perusahaan.com"
            />
          </Field>

          <Field id="j_desc" label="Ringkasan" hint={`${descLength}/${DESC_MAX} · tanggung jawab, kualifikasi utama, stack.`}>
            <textarea
              id="j_desc"
              name="description"
              rows={5}
              required
              minLength={DESC_MIN}
              maxLength={DESC_MAX}
              defaultValue={editing?.description}
              placeholder="Mis. Bangun layanan pembayaran pakai Go & PostgreSQL. Min. 2 tahun pengalaman backend."
              onChange={(e) => setDescLength(e.target.value.length)}
            />
          </Field>

          <div className="rec-row">
            <Field id="j_type" label="Tipe">
              <select id="j_type" name="employment_type" defaultValue={editing?.employment_type ?? 'full_time'}>
                {(Object.keys(EMPLOYMENT_LABEL) as JobEmploymentType[]).map((t) => (
                  <option key={t} value={t}>
                    {EMPLOYMENT_LABEL[t]}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="j_mode" label="Mode kerja">
              <select id="j_mode" name="work_mode" defaultValue={editing?.work_mode ?? 'onsite'}>
                {(Object.keys(WORK_MODE_LABEL) as JobWorkMode[]).map((m) => (
                  <option key={m} value={m}>
                    {WORK_MODE_LABEL[m]}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="j_loc" label="Kota" optional>
              <input id="j_loc" name="location" maxLength={80} defaultValue={editing?.location} />
            </Field>
          </div>

          <div className="rec-row">
            <Field id="j_level" label="Level" optional>
              <select id="j_level" name="level" defaultValue={editing?.level ?? ''}>
                <option value="">—</option>
                {(Object.keys(LEVEL_LABEL) as JobLevel[]).map((l) => (
                  <option key={l} value={l}>
                    {LEVEL_LABEL[l]}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="j_salary" label="Gaji" optional>
              <input id="j_salary" name="salary" maxLength={80} defaultValue={editing?.salary} placeholder="Mis. 10–15 jt" />
            </Field>
            <Field id="j_deadline" label="Batas lamaran" optional>
              <input id="j_deadline" name="deadline" type="date" min={todayWib()} defaultValue={editing?.deadline ?? ''} />
            </Field>
          </div>

          <fieldset className="field">
            <legend>Hubunganmu dengan loker ini</legend>
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
            Tampilkan namaku di kartu loker
          </label>
          {showName && (
            <label className="rec-check">
              <input type="checkbox" name="open_to_questions" defaultChecked={editing?.open_to_questions ?? false} />
              Boleh ditanya-tanya soal loker ini (lewat profilku)
            </label>
          )}

          <p className="rec-rules">
            Tanpa batas lamaran, loker tampil 45 hari. Loker yang minta biaya, deposit, atau data sensitif akan ditolak. Selengkapnya di{' '}
            <Link to="/code-of-conduct">Code of Conduct</Link>.
          </p>

          {error && <p className="form-message error">{error}</p>}
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Mengirim…' : editing ? 'Simpan perubahan' : isPoster ? 'Tayangkan loker' : 'Kirim rekomendasi'}
          </button>
        </form>
      </div>
    </section>
  );
}
