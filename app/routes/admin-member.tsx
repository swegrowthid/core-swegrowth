import { data, Link } from 'react-router';
import type { Route } from './+types/admin-member';
import { ProfileView } from '~/components/ProfileView';
import { requireAdmin } from '~/lib/auth';
import { formatDate } from '~/lib/format';
import { MOTIVATION_QUESTIONS, publicProfilePath } from '~/lib/profile';
import { MEMBERSHIP_LIVE } from '~/lib/site';
import { supabase } from '~/lib/supabase';

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: `${loaderData?.profile.full_name || 'Member'} — Admin SWE Growth` },
  { name: 'robots', content: 'noindex' },
];

export async function clientLoader({ request, params }: Route.ClientLoaderArgs) {
  await requireAdmin(request);
  const db = supabase();
  const [profile, membership, motivation, regs, activities] = await Promise.all([
    db.from('profiles').select('*').eq('id', params.id).maybeSingle(),
    db.from('memberships').select('*').eq('user_id', params.id).maybeSingle(),
    db.from('member_motivations').select('*').eq('user_id', params.id).maybeSingle(),
    db
      .from('activity_registrations')
      .select('activity_id, status, created_at')
      .eq('user_id', params.id)
      .order('created_at', { ascending: false }),
    db.from('activities').select('id, title, slug'),
  ]);
  if (!profile.data) throw data(null, { status: 404 });
  const activityOf = new Map((activities.data ?? []).map((a) => [a.id, a]));
  return {
    profile: profile.data,
    membership: membership.data,
    motivation: motivation.data,
    registrations: (regs.data ?? []).map((r) => ({ ...r, activity: activityOf.get(r.activity_id) ?? null })),
  };
}

export function HydrateFallback() {
  return <div className="loading-block">Memuat profil…</div>;
}

export default function AdminMember({ loaderData: { profile, membership, motivation, registrations } }: Route.ComponentProps) {
  return (
    <section className="block">
      <div className="wrap narrow-wrap portal-stack">
        <Link className="back" to="/admin">
          ← Admin
        </Link>
        <ProfileView
          profile={profile}
          actions={
            <Link className="btn btn-ghost sm" to={publicProfilePath(profile)}>
              Profil publik
            </Link>
          }
        />

        <div className="panel">
          <div className="panel-head">
            <h2>Kenalan</h2>
          </div>
          {motivation ? (
            <dl className="answers">
              {MOTIVATION_QUESTIONS.filter((q) => motivation[q.name]).map((q) => (
                <div key={q.name}>
                  <dt>{q.label}</dt>
                  <dd>{motivation[q.name]}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="muted">Belum mengisi.</p>
          )}
        </div>

        {MEMBERSHIP_LIVE && (
          <div className="panel">
            <div className="panel-head">
              <h2>Membership</h2>
            </div>
            <p className="muted">
              {membership
                ? `Aktif sampai ${formatDate(membership.active_until)}${membership.goakal_ref ? ` · ${membership.goakal_ref}` : ''}`
                : 'Belum pernah aktif.'}
            </p>
          </div>
        )}

        {registrations.length > 0 && (
          <div className="panel">
            <div className="panel-head">
              <h2>Kegiatan diikuti ({registrations.length})</h2>
            </div>
            <ul className="rows">
              {registrations.map((r, i) => (
                <li key={i}>
                  <div className="row-main">
                    {r.activity ? (
                      <Link className="title" to={`/agenda/${r.activity.slug}`}>
                        {r.activity.title}
                      </Link>
                    ) : (
                      <strong>(event dihapus)</strong>
                    )}
                    <span>Daftar {formatDate(r.created_at)}</span>
                  </div>
                  <span className="chip">{r.status}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
