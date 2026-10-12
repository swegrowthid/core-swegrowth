import { Link, useSearchParams } from 'react-router';
import type { Route } from './+types/agenda';
import { AgendaList } from '~/components/AgendaList';
import {
  activityPath,
  getCommunityGroups,
  getPublishedActivities,
  organizerOf,
  upcomingSessions,
  withDocumentation,
} from '~/lib/activities';
import { formatWibDate } from '~/lib/format';
import { PAST_ACTIVITIES } from '~/lib/past-activities';
import { pageMeta } from '~/lib/site';

const monthFmt = new Intl.DateTimeFormat('id-ID', { month: 'short', year: 'numeric' });

export const meta: Route.MetaFunction = () =>
  pageMeta('Agenda — SWE Growth', 'Agenda kegiatan komunitas SWE Growth. Daftar gratis dengan akun Google.');

const load = async () => {
  const [activities, groups] = await Promise.all([getPublishedActivities(), getCommunityGroups()]);
  return { activities: upcomingSessions(activities), documented: withDocumentation(activities).slice(0, 12), groups };
};

/** Saat build: snapshot agenda untuk HTML prerender. */
export async function loader() {
  return load();
}

/** Di browser: selalu ambil agenda terbaru. */
export async function clientLoader() {
  return load();
}
clientLoader.hydrate = true as const;

/** Filter penyelenggara (?oleh=slug-subgrup) disimpan di URL supaya bisa dibagikan. */
export default function Agenda({ loaderData: { activities, documented, groups } }: Route.ComponentProps) {
  const [params, setParams] = useSearchParams();
  const group = groups.find((g) => g.slug === params.get('oleh')) ?? null;
  // Hanya subgrup yang punya agenda atau dokumentasi.
  const usedGroups = groups.filter((g) => [...activities, ...documented].some((a) => a.organizer_group_id === g.id));
  const byGroup = <T extends { organizer_group_id: string | null }>(list: T[]) =>
    group ? list.filter((a) => a.organizer_group_id === group.id) : list;
  const shown = byGroup(activities);
  const docs = byGroup(documented);

  const choose = (slug: string | null) =>
    setParams(slug ? { oleh: slug } : {}, { replace: true, preventScrollReset: true });

  return (
    <section className="block">
      <div className="wrap narrow-wrap">
        <h1 className="page-title">Agenda</h1>
        <p className="muted" style={{ marginBottom: 28 }}>
          Kegiatan komunitas SWE Growth, termasuk yang diadakan subgrup seperti English Club. Pilih kegiatan untuk melihat
          detail dan mendaftar. Daftarnya gratis, cukup login dengan Google.
        </p>

        {usedGroups.length > 0 && (
          <nav className="rec-tabs" aria-label="Penyelenggara">
            <button type="button" aria-pressed={!group} onClick={() => choose(null)}>Semua</button>
            {usedGroups.map((g) => (
              <button key={g.id} type="button" aria-pressed={group?.id === g.id} onClick={() => choose(g.slug)}>{g.name}</button>
            ))}
          </nav>
        )}
        {group?.description && <p className="muted" style={{ marginBottom: 16 }}>{group.description}</p>}

        {shown.length === 0 ? (
          <p className="muted">{group ? `Belum ada kegiatan ${group.name} terjadwal.` : 'Belum ada kegiatan terjadwal.'}</p>
        ) : (
          <div className="panel"><AgendaList activities={shown} groups={groups} /></div>
        )}

        {docs.length > 0 && (
          <section className="agenda-docs">
            <h2>Dokumentasi kegiatan</h2>
            <ul className="doc-cards">
              {docs.map((a) => {
                const organizer = organizerOf(a, groups);
                return (
                  <li key={a.id}>
                    <Link to={`${activityPath(a)}#dokumentasi`}>
                      <img src={a.photos[0].url} alt={a.photos[0].caption || a.title} loading="lazy" />
                      <span className="doc-card-count">{a.photos.length} foto</span>
                      <strong>{a.title}</strong>
                      <span>{[a.starts_at && formatWibDate(a.starts_at), organizer?.name].filter(Boolean).join(' · ')}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <details className="past-activities">
          <summary>Kegiatan sebelumnya ({PAST_ACTIVITIES.length}+ sejak 2024)</summary>
          <ul>
            {PAST_ACTIVITIES.map((a) => (
              <li key={`${a.month}-${a.title}`}>
                <time>{monthFmt.format(new Date(`${a.month}-01T00:00:00`))}</time>
                {a.title}
              </li>
            ))}
          </ul>
          <p>
            Dirangkum dari arsip media SWE Growth:{' '}
            <a href="https://x.com/swegrowthid" target="_blank" rel="noreferrer">X</a> dan{' '}
            <a href="https://www.youtube.com/@segrowthid" target="_blank" rel="noreferrer">YouTube</a>.
          </p>
        </details>
      </div>
    </section>
  );
}
