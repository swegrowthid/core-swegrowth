/**
 * Preview link kegiatan & tanya jawabnya untuk WhatsApp, Telegram, X, LinkedIn, dst.
 *
 * Kegiatan yang sudah ada saat build di-prerender lengkap dengan meta. Kegiatan
 * yang lebih baru, dan halaman tanya jawab (/agenda/:slug/tanya, selalu SPA),
 * dilayani app shell tanpa meta, sedangkan crawler preview tidak menjalankan
 * JS. Untuk crawler saja, edge function ini mengambil kegiatan dari Supabase
 * lalu menyisipkan title + Open Graph ke HTML sebelum dikirim.
 * Pengunjung biasa langsung dilayani tanpa menunggu Supabase.
 * Gagal ambil data = HTML dikirim apa adanya, halaman tetap jalan.
 *
 * Gambarnya kartu bergaya poster dari build (/og/agenda/:slug.png,
 * /og/tanya/:slug.png; lihat app/lib/og-image.ts). Kegiatan yang belum punya
 * gambar karena belum di-build ulang jatuh ke kartu komunitas (netlify.toml).
 */
import type { Config, Context } from '@netlify/edge-functions';
import { isbot } from 'isbot';

const SITE_URL = 'https://swegrowth.id';

type Activity = {
  title: string;
  summary: string | null;
  starts_at: string | null;
  mode: string | null;
  image_url: string | null;
  slug: string;
  speaker: string | null;
  qna_status: string;
  updated_at: string | null;
};

const wibDay = new Intl.DateTimeFormat('id-ID', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Asia/Jakarta',
});
const wibTime = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Sama dengan ogImage() di app/lib/og.ts. */
const ogImage = (path: string, version: string | null) => `${SITE_URL}${path}${version ? `?v=${Date.parse(version).toString(36)}` : ''}`;

async function fetchActivity(slug: string): Promise<Activity | null> {
  const url = Netlify.env.get('VITE_SUPABASE_URL');
  const key = Netlify.env.get('VITE_SUPABASE_PUBLISHABLE_KEY');
  if (!url || !key) return null;

  const query = new URLSearchParams({
    select: 'title,summary,starts_at,mode,image_url,slug,speaker,qna_status,updated_at',
    slug: `eq.${slug}`,
    is_public: 'eq.true',
    limit: '1',
  });
  const res = await fetch(`${url}/rest/v1/activities?${query}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(2000),
  });
  if (!res.ok) return null;
  const rows: Activity[] = await res.json();
  return rows[0] ?? null;
}

type Preview = { title: string; description: string; url: string; image: string };

function eventPreview(a: Activity): Preview {
  const start = a.starts_at ? new Date(a.starts_at) : null;
  const when = start ? `${wibDay.format(start)}, ${wibTime.format(start)} WIB` : 'Jadwal menyusul';
  const where = a.mode ? ` · ${a.mode[0].toUpperCase()}${a.mode.slice(1)}` : '';
  return {
    title: `${a.title} — SWE Growth`,
    description: `${when}${where}. ${a.summary || 'Kegiatan komunitas SWE Growth.'}`,
    url: `${SITE_URL}/agenda/${a.slug}`,
    // Poster dari admin diutamakan, sama dengan meta di routes/event.tsx.
    image: a.image_url || ogImage(`/og/agenda/${a.slug}.png`, a.updated_at),
  };
}

/** Sama dengan qnaShareCopy() di app/lib/og.ts (dipakai routes/event-qna.tsx). */
const qnaPreview = (a: Activity): Preview => ({
  title: `Tanya jawab: ${a.title} — SWE Growth`,
  description:
    a.qna_status === 'closed'
      ? `Sesi tanya jawab untuk ${a.speaker || 'pembicara'} sudah ditutup. Lihat pertanyaan yang masuk.`
      : `Punya pertanyaan untuk ${a.speaker || 'pembicara'}? Kirim pertanyaanmu dan vote pertanyaan yang paling ingin kamu dengar jawabannya.`,
  url: `${SITE_URL}/agenda/${a.slug}/tanya`,
  image: ogImage(`/og/tanya/${a.slug}.png`, a.updated_at),
});

function metaTags(p: Preview) {
  const tags: [string, string, string][] = [
    ['name', 'description', p.description],
    ['property', 'og:type', 'website'],
    ['property', 'og:site_name', 'SWE Growth'],
    ['property', 'og:locale', 'id_ID'],
    ['property', 'og:url', p.url],
    ['property', 'og:title', p.title],
    ['property', 'og:description', p.description],
    ['property', 'og:image', p.image],
    ['property', 'og:image:alt', p.title],
    ['name', 'twitter:card', 'summary_large_image'],
    ['name', 'twitter:title', p.title],
    ['name', 'twitter:description', p.description],
    ['name', 'twitter:image', p.image],
  ];
  return [
    `<title>${escape(p.title)}</title>`,
    `<link rel="canonical" href="${escape(p.url)}"/>`,
    ...tags.map(([attr, key, value]) => `<meta ${attr}="${key}" content="${escape(value)}"/>`),
  ].join('');
}

export default async function handler(request: Request, context: Context) {
  // Detail (/agenda/:slug) dan tanya jawab (/agenda/:slug/tanya); /daftar, /terdaftar, /tanya/layar dibiarkan.
  const match = new URL(request.url).pathname.match(/^\/agenda\/([^/]+)(\/tanya)?\/?$/);
  if (!match || !isbot(request.headers.get('user-agent'))) return;
  const [, slug, qna] = match;

  const [response, activity] = await Promise.all([context.next(), fetchActivity(decodeURIComponent(slug)).catch(() => null)]);
  if (!activity || !response.headers.get('content-type')?.includes('text/html')) return response;

  const original = await response.text();
  // HTML prerender sudah punya meta kegiatan.
  if (original.includes('property="og:title"')) return new Response(original, response);

  const html = original
    // Title & deskripsi default dari app shell diganti punya halaman ini.
    .replace(/<title>[^<]*<\/title>/, '')
    .replace(/<meta name="description"[^>]*>/, '')
    .replace('</head>', `${metaTags(qna ? qnaPreview(activity) : eventPreview(activity))}</head>`);

  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return new Response(html, { status: response.status, headers });
}

export const config: Config = { path: '/agenda/*' };
