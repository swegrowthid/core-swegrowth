import { useState, type FormEvent } from 'react';
import { data, Link, redirect, useNavigate } from 'react-router';
import type { Route } from './+types/event-register';
import { EventSummary } from '~/components/EventSummary';
import {
  activityPath,
  canRegister,
  fetchMyRegistration,
  getPublishedActivityBySlug,
  isActiveRegistration,
  isPaid,
  registeredPath,
  syncCalendar,
  joinActivity,
} from '~/lib/activities';
import { fetchProfile, requireUser } from '~/lib/auth';
import type { RegistrationField } from '~/lib/database.types';
import { WHATSAPP_RE } from '~/lib/profile';

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: `Daftar: ${loaderData?.activity.title ?? 'Kegiatan'} — SWE Growth` },
  { name: 'robots', content: 'noindex' },
];

/** Langkah 2 pendaftaran: form, terisi dari profil + pertanyaan khusus event. */
export async function clientLoader({ request, params }: Route.ClientLoaderArgs) {
  const user = await requireUser(request);
  const activity = await getPublishedActivityBySlug(params.slug);
  if (!activity) throw data(null, { status: 404 });

  const [profile, registration] = await Promise.all([fetchProfile(user.id), fetchMyRegistration(activity.id, user.id)]);
  if (isActiveRegistration(registration?.status)) throw redirect(registeredPath(activity));
  if (!canRegister(activity) || isPaid(activity)) throw redirect(activityPath(activity));

  const meta = user.user_metadata as { full_name?: string; name?: string };
  return {
    activity,
    email: user.email ?? '',
    name: profile?.full_name || meta.full_name || meta.name || '',
    whatsapp: profile?.whatsapp ?? '',
    previous: registration,
  };
}

export function HydrateFallback() {
  return <div className="loading-block">Menyiapkan form pendaftaran…</div>;
}

const errorText = (message: string) =>
  message.includes('registration_closed')
    ? 'Pendaftaran sudah ditutup.'
    : message.includes('whatsapp_required')
      ? 'Nomor WhatsApp 8–20 digit, boleh diawali +.'
      : message.includes('answer_required')
        ? 'Ada pertanyaan wajib yang belum dijawab.'
        : message.includes('payment_required')
          ? 'Kegiatan ini berbayar; pembayaran belum tersedia.'
          : 'Pendaftaran belum berhasil. Coba lagi sebentar lagi.';

export default function EventRegister({ loaderData }: Route.ComponentProps) {
  const { activity: a, email, name, whatsapp, previous } = loaderData;
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const val = (key: string) => String(form.get(key) ?? '').trim();

    if (!WHATSAPP_RE.test(val('whatsapp'))) {
      setError('Nomor WhatsApp 8–20 digit, boleh diawali +.');
      return;
    }

    setBusy(true);
    setError(null);
    const { error: rpcError } = await joinActivity({
      activityId: a.id,
      name: val('name'),
      whatsapp: val('whatsapp'),
      answers: Object.fromEntries(a.registration_fields.map((f) => [f.id, val(`answer-${f.id}`)])),
    });
    if (rpcError) {
      setBusy(false);
      setError(errorText(rpcError.message));
      return;
    }
    // Kirim undangan Google Calendar; tunggu sebentar supaya halaman konfirmasi bisa menyebutnya.
    const calendar = await Promise.race([syncCalendar(a.id), new Promise<null>((r) => setTimeout(() => r(null), 6000))]);
    navigate(registeredPath(a), {
      replace: true,
      state: {
        justRegistered: true,
        invited: calendar?.status === 'created' || calendar?.status === 'updated' || calendar?.status === 'unchanged',
      },
    });
  };

  return (
    <section className="block">
      <div className="wrap" style={{ maxWidth: 680 }}>
        <Link className="back" to={activityPath(a)}>
          ← Detail kegiatan
        </Link>
        <h1 className="page-title">{a.status === 'full' ? 'Daftar waitlist' : 'Form pendaftaran'}</h1>
        <EventSummary activity={a} />

        <form className="form-card wide" onSubmit={onSubmit} style={{ marginTop: 20 }}>
          {error && <p className="form-message error">{error}</p>}
          {previous?.status === 'cancelled' && (
            <p className="form-message">Kamu pernah membatalkan pendaftaran ini. Silakan daftar lagi.</p>
          )}

          <fieldset className="profile-section">
            <legend>Data peserta</legend>
            <p className="form-sub">Terisi dari profilmu. Perubahan di sini juga melengkapi profil yang masih kosong.</p>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="name">Nama lengkap</label>
                <input id="name" name="name" required maxLength={80} defaultValue={name} autoComplete="name" />
              </div>
              <div className="field">
                <label htmlFor="whatsapp">Nomor WhatsApp</label>
                <input id="whatsapp" name="whatsapp" type="tel" required defaultValue={whatsapp} autoComplete="tel" placeholder="08…" />
              </div>
              <div className="field span-2">
                <label htmlFor="email">Email</label>
                <input id="email" value={email} readOnly disabled />
              </div>
            </div>
          </fieldset>

          {a.registration_fields.length > 0 && (
            <fieldset className="profile-section">
              <legend>Pertanyaan tambahan</legend>
              {a.registration_fields.map((f) => (
                <AnswerField key={f.id} field={f} />
              ))}
            </fieldset>
          )}

          <label className="check-field">
            <input type="checkbox" required /> Saya akan mengikuti{' '}
            <Link className="text-link" to="/code-of-conduct" target="_blank">
              Code of Conduct
            </Link>{' '}
            SWE Growth.
          </label>

          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            {busy ? 'Memproses…' : a.status === 'full' ? 'Konfirmasi daftar waitlist' : 'Konfirmasi pendaftaran'}
          </button>
        </form>
      </div>
    </section>
  );
}

function AnswerField({ field: f }: { field: RegistrationField }) {
  const id = `answer-${f.id}`;
  return (
    <div className="field">
      <label htmlFor={id}>
        {f.label}
        {!f.required && <small> (opsional)</small>}
      </label>
      {f.type === 'textarea' ? (
        <textarea id={id} name={id} rows={3} maxLength={2000} required={f.required} />
      ) : f.type === 'select' ? (
        <select id={id} name={id} required={f.required} defaultValue="">
          <option value="" disabled={f.required}>
            Pilih…
          </option>
          {(f.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <input id={id} name={id} maxLength={200} required={f.required} />
      )}
    </div>
  );
}
