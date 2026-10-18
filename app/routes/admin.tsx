import { Link, useSearchParams } from 'react-router';
import type { Route } from './+types/admin';
import { ActivitiesAdmin } from '~/components/admin/ActivitiesAdmin';
import { CommunityGroupsAdmin } from '~/components/admin/CommunityGroupsAdmin';
import { ContributionsAdmin } from '~/components/admin/ContributionsAdmin';
import { MembersAdmin } from '~/components/admin/MembersAdmin';
import { RecommendationsAdmin } from '~/components/admin/RecommendationsAdmin';
import { WhatsappGroupsAdmin } from '~/components/admin/WhatsappGroupsAdmin';
import { loadAdminDashboard } from '~/lib/admin-data';
import { requireAdmin, useAuth } from '~/lib/auth';

export const meta: Route.MetaFunction = () => [{ title: 'Admin — SWE Growth' }, { name: 'robots', content: 'noindex' }];

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
  await requireAdmin(request);
  return loadAdminDashboard();
}

export function HydrateFallback() {
  return <div className="loading-block">Memuat admin…</div>;
}

type Tab = 'member' | 'event' | 'subgrup' | 'grup' | 'kontribusi' | 'rekomendasi';
const TABS: { id: Tab; label: string }[] = [
  { id: 'member', label: 'Member' },
  { id: 'event', label: 'Event' },
  { id: 'subgrup', label: 'Subgrup' },
  { id: 'grup', label: 'Grup WhatsApp' },
  { id: 'kontribusi', label: 'Kontribusi member' },
  { id: 'rekomendasi', label: 'Rekomendasi' },
];

export default function Admin({ loaderData }: Route.ComponentProps) {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const tab = TABS.find((t) => t.id === params.get('tab'))?.id ?? 'member';
  const pendingRecs = loaderData.recommendations.filter((r) => r.status === 'pending').length;

  return (
    <section className="block">
      <div className="wrap admin-wrap">
        <h1 className="page-title">Admin</h1>
        <p className="form-sub">Masuk sebagai {user?.email}. Perubahan langsung berlaku tanpa deploy ulang.</p>

        <nav className="member-tabs" aria-label="Bagian admin">
          {TABS.map((t) => (
            <Link key={t.id} to={t.id === 'member' ? '/admin' : `/admin?tab=${t.id}`} aria-current={tab === t.id ? 'page' : undefined}>
              {t.label}
              {t.id === 'rekomendasi' && pendingRecs > 0 && <span className="chip yellow tab-soon">{pendingRecs}</span>}
            </Link>
          ))}
        </nav>

        <div style={{ marginTop: 24 }}>
          {tab === 'member' && (
            <MembersAdmin profiles={loaderData.profiles} memberships={loaderData.memberships} motivations={loaderData.motivations} />
          )}
          {tab === 'event' && (
            <ActivitiesAdmin
              activities={loaderData.activities}
              registrations={loaderData.registrations}
              groups={loaderData.communityGroups}
            />
          )}
          {tab === 'subgrup' && <CommunityGroupsAdmin groups={loaderData.communityGroups} activities={loaderData.activities} />}
          {tab === 'grup' && <WhatsappGroupsAdmin groups={loaderData.groups} />}
          {tab === 'rekomendasi' && (
            <RecommendationsAdmin
              items={loaderData.recommendations}
              profiles={loaderData.profiles}
              topics={loaderData.recommendationTopics}
            />
          )}
          {tab === 'kontribusi' && <ContributionsAdmin contributions={loaderData.contributions} profiles={loaderData.profiles} />}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Member
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Event
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Subgrup komunitas (penyelenggara event)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Kontribusi member (section "Dari member ke member" di landing)
// ---------------------------------------------------------------------------
