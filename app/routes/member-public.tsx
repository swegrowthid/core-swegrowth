import { data, Link } from 'react-router';
import type { Route } from './+types/member-public';
import { ProfileView } from '~/components/ProfileView';
import { useAuth } from '~/lib/auth';
import { fetchPublicProfile } from '~/lib/profile';
import { pageMeta } from '~/lib/site';

export const meta: Route.MetaFunction = ({ loaderData }) => {
  const p = loaderData?.profile;
  if (!p) return [{ title: 'Profil tidak ditemukan — SWE Growth' }];
  const role = [p.headline, p.company].filter(Boolean).join(' · ');
  return pageMeta(
    `${p.full_name} — SWE Growth`,
    role ? `${p.full_name}, ${role}. Member SWE Growth.` : `${p.full_name}, member SWE Growth.`,
  );
};

/** Profil publik member. Data lewat public_profile(): tanpa WhatsApp, email, dan jawaban kenalan. */
export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const profile = await fetchPublicProfile(params.handle);
  if (!profile) throw data(null, { status: 404 });
  return { profile };
}

export function HydrateFallback() {
  return <div className="loading-block">Memuat profil…</div>;
}

export default function MemberPublic({ loaderData: { profile } }: Route.ComponentProps) {
  const { user } = useAuth();
  const isOwn = user?.id === profile.id;

  return (
    <section className="block">
      <div className="wrap narrow-wrap">
        <ProfileView
          profile={profile}
          actions={
            isOwn && (
              <Link className="btn btn-ghost sm" to="/portal/profil/edit">
                Edit profil
              </Link>
            )
          }
        />
        {!user && (
          <div className="panel on-teal join-cta">
            <div>
              <h2>Gabung SWE Growth</h2>
              <p>Komunitas software engineer Indonesia untuk bareng-bareng belajar career growth. Gratis.</p>
            </div>
            <Link className="btn btn-primary" to="/masuk?next=/portal">
              Daftar gratis
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
