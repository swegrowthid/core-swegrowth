import { getCommunityGroups, getCommunityStats, getPublishedActivities, upcomingSessions } from '~/lib/activities';
import type { Ctx } from '~/lib/event-poster';
import { ogPaths } from '~/lib/og';
import { drawAgendaOg, drawCommunityOg, drawEventOg, drawQnaOg } from '~/lib/og-image';

export { OG_H, OG_W } from '~/lib/og-image';
import { PAST_ACTIVITIES } from '~/lib/past-activities';
import { TOPICS } from '~/lib/topics';

export type OgJob = { path: string; draw: (ctx: Ctx, logo: CanvasImageSource) => void };

const count = (n: number) => n.toLocaleString('id-ID');

/**
 * Semua gambar preview yang dibuat saat build. Tanpa env Supabase (CI, fork)
 * hanya beranda & agenda, tanpa angka dan kegiatan.
 */
export async function ogJobs(): Promise<OgJob[]> {
  const [activities, groups, stats] = await Promise.all([getPublishedActivities(), getCommunityGroups(), getCommunityStats()]);
  const upcoming = upcomingSessions(activities);

  // Angka sama dengan hero beranda.
  const community = {
    stats: [
      ...(stats ? [{ value: count(stats.member_count), label: 'member' }] : []),
      ...(stats ? [{ value: count(PAST_ACTIVITIES.length + stats.session_count), label: 'sesi komunitas' }] : []),
      { value: '10+', label: 'topik diskusi' },
    ],
    topics: TOPICS.map((t) => t.name),
    next: upcoming.find((a) => a.starts_at) ?? null,
  };

  return [
    { path: ogPaths.home, draw: (ctx, logo) => drawCommunityOg(ctx, logo, community) },
    { path: ogPaths.agenda, draw: (ctx, logo) => drawAgendaOg(ctx, logo, upcoming, groups) },
    ...activities.flatMap((a): OgJob[] => [
      { path: ogPaths.event(a.slug), draw: (ctx, logo) => drawEventOg(ctx, logo, a, groups) },
      { path: ogPaths.qna(a.slug), draw: (ctx, logo) => drawQnaOg(ctx, logo, a) },
    ]),
  ];
}
