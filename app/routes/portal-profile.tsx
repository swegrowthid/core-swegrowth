import { useState } from 'react';
import { Link } from 'react-router';
import type { Route } from './+types/portal-profile';
import { PortalHeader } from '~/components/PortalHeader';
import { ProfileView } from '~/components/ProfileView';
import { fetchProfile, requireUser, useSignOut } from '~/lib/auth';
import { fetchMotivation, isOnboarded, missingOnboardingParts, missingProfileParts, publicProfilePath } from '~/lib/profile';

export const meta: Route.MetaFunction = () => [{ title: 'Profil — SWE Growth' }, { name: 'robots', content: 'noindex' }];

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const user = await requireUser(request);
  const [profile, motivation] = await Promise.all([fetchProfile(user.id), fetchMotivation(user.id)]);
  if (!profile) throw new Error('Profil tidak ditemukan.');
  return { profile, onboarded: isOnboarded(profile, motivation), required: missingOnboardingParts(profile, motivation) };
}

export default function PortalProfile({ loaderData: { profile, onboarded, required } }: Route.ComponentProps) {
  const { signOut, busy } = useSignOut();
  const missing = missingProfileParts(profile);
  const publicPath = publicProfilePath(profile);
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}${publicPath}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <PortalHeader />
      <section className="block" style={{ paddingTop: 8 }}>
        <div className="wrap narrow-wrap portal-stack">
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
            <p className="form-message success">
              Tambahkan {missing.join(', ')} supaya profilmu makin lengkap.{' '}
              <Link className="text-link" to="/portal/profil/edit">
                Lengkapi
              </Link>
            </p>
          )}

          {onboarded && (
            <div className="panel">
              <div className="panel-head">
                <h2>Profil publik</h2>
              </div>
              <p className="muted" style={{ marginBottom: 12 }}>
                Siapa pun bisa melihat profilmu lewat link ini. Nomor WhatsApp, email, dan jawaban kenalan tidak ikut tampil.
              </p>
              <div className="share-link">
                <code>swegrowth.id{publicPath}</code>
                <button className="btn btn-ghost sm" type="button" onClick={copyLink}>
                  {copied ? 'Tersalin ✓' : 'Salin link'}
                </button>
                <Link className="text-link" to={publicPath}>
                  Lihat sebagai publik
                </Link>
              </div>
            </div>
          )}

          <ProfileView
            profile={profile}
            actions={
              <Link className="btn btn-primary sm" to={onboarded ? '/portal/profil/edit' : '/onboarding?next=/portal/profil'}>
                {onboarded ? 'Edit profil' : 'Lengkapi profil'}
              </Link>
            }
          />

          <div className="profile-signout">
            <button className="btn btn-ghost sm" type="button" disabled={busy} onClick={signOut}>
              {busy ? 'Keluar…' : 'Keluar dari akun'}
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
