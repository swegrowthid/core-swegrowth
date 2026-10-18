import { Link, useNavigate } from 'react-router';
import type { Route } from './+types/portal-profile-edit';
import { PortalHeader } from '~/components/PortalHeader';
import { ProfileForm } from '~/components/ProfileForm';
import { fetchProfile, requireUser, useAuth } from '~/lib/auth';

export const meta: Route.MetaFunction = () => [{ title: 'Edit profil — SWE Growth' }, { name: 'robots', content: 'noindex' }];

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  const user = await requireUser(request);
  const profile = await fetchProfile(user.id);
  if (!profile) throw new Error('Profil tidak ditemukan.');
  return { profile, email: user.email ?? '' };
}

export default function PortalProfileEdit({ loaderData: { profile, email } }: Route.ComponentProps) {
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      <PortalHeader />
      <section className="block tight-top">
        <div className="wrap narrow-wrap">
          <Link className="back" to="/portal/profil">
            ← Profil
          </Link>
          <p className="muted mb-18">
            Email akun: {email}. Profil tampil publik, kecuali nomor WhatsApp dan email yang hanya terlihat oleh kamu dan admin.
          </p>
          <ProfileForm
            profile={profile}
            submitLabel="Simpan profil"
            onSaved={async () => {
              await refreshProfile();
              navigate('/portal/profil');
            }}
          />
        </div>
      </section>
    </>
  );
}
