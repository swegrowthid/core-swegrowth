import { useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import type { Route } from './+types/portal-profile';
import { PortalPage, PortalSection } from '~/components/Portal';
import { ProfileView } from '~/components/ProfileView';
import { fetchProfile, requireUser } from '~/lib/auth';
import { fetchMotivation, isOnboarded, missingOnboardingParts, missingProfileParts, publicProfilePath } from '~/lib/profile';

export const meta: Route.MetaFunction = () => [{ title: 'Profil — SWE Growth' }, { name: 'robots', content: 'noindex' }];

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const user = await requireUser(request);
  const [profile, motivation] = await Promise.all([fetchProfile(user.id), fetchMotivation(user.id)]);
  if (!profile) throw new Error('Profil tidak ditemukan.');
  return { profile, onboarded: isOnboarded(profile, motivation), required: missingOnboardingParts(profile, motivation) };
}

export default function PortalProfile({ loaderData: { profile, onboarded, required } }: Route.ComponentProps) {
  // Dikirim halaman edit setelah simpan berhasil.
  const saved = (useLocation().state as { saved?: boolean } | null)?.saved === true;
  const missing = missingProfileParts(profile);
  const publicPath = publicProfilePath(profile);
  // Domain yang tampil mengikuti situs yang sedang dibuka, sama dengan yang disalin.
  const publicUrl = `${window.location.host}${publicPath}`;
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const linkRef = useRef<HTMLElement>(null);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${publicPath}`);
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 2000);
    } catch {
      // Clipboard ditolak (izin/konteks tidak aman): pilih teks link supaya bisa disalin manual.
      const el = linkRef.current;
      if (el) window.getSelection()?.selectAllChildren(el);
      setCopyState('failed');
    }
  };

  return (
    <PortalPage
      title="Profil"
      actions={
        onboarded && (
          <Link className="btn btn-primary" to="/portal/profil/edit">
            Edit profil
          </Link>
        )
      }
    >
      {saved && (
        <p className="form-message success" role="status">
          Profil tersimpan.
        </p>
      )}

      {!onboarded && (
        <div className="panel complete-card">
          <div>
            <h2>Lengkapi profilmu dulu, yuk</h2>
            <p className="muted">
              Tinggal sedikit lagi. Setelah lengkap, kamu dapat link komunitas (WhatsApp, Telegram), bisa daftar kegiatan, dan profil
              publikmu aktif.
            </p>
            <p className="complete-missing">Yang belum: {required.join(', ')}.</p>
          </div>
          <Link className="btn btn-primary" to="/onboarding?next=/portal/profil">
            Lengkapi sekarang
          </Link>
        </div>
      )}

      {onboarded && missing.length > 0 && (
        <p className="portal-nudge">
          Tambahkan {missing.join(', ')} supaya profilmu makin lengkap.{' '}
          <Link className="text-link" to="/portal/profil/edit">
            Lengkapi
          </Link>
        </p>
      )}

      <ProfileView profile={profile} />

      {onboarded && (
        <PortalSection title="Link profil publik">
          <div className="panel">
            <p className="muted mb-12">
              Siapa pun bisa melihat profilmu lewat link ini. Nomor WhatsApp, email, dan jawaban kenalan tidak ikut tampil.
            </p>
            <div className="share-link">
              <code ref={linkRef}>{publicUrl}</code>
              <button className="btn btn-ghost sm" type="button" onClick={copyLink}>
                {copyState === 'copied' ? 'Tersalin' : 'Salin link'}
              </button>
              <Link className="text-link" to={publicPath}>
                Lihat sebagai publik
              </Link>
            </div>
            <p className="share-status" aria-live="polite">
              {copyState === 'copied' && 'Link profil tersalin.'}
              {copyState === 'failed' && 'Tidak bisa menyalin otomatis. Link sudah dipilih, tekan Ctrl+C atau ⌘C.'}
            </p>
          </div>
        </PortalSection>
      )}

      <p className="portal-footnote">
        Usulan rekomendasimu ada di{' '}
        <Link className="text-link" to="/portal/rekomendasiku">
          Rekomendasiku
        </Link>
        . Membership dan badge verified member{' '}
        <Link className="text-link" to="/portal/membership">
          segera hadir
        </Link>
        .
      </p>
    </PortalPage>
  );
}
