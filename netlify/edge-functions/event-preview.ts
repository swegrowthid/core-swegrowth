/**
 * Meta halaman kegiatan & tanya jawabnya (title, Open Graph) untuk preview
 * link di WhatsApp, Telegram, X, LinkedIn, dst., dan untuk mesin pencari.
 *
 * Halaman kegiatan tidak di-prerender: semuanya dilayani app shell SPA, yang
 * isinya dimuat di browser. Edge function ini mengambil kegiatan dari Supabase
 * lalu menyisipkan meta-nya ke HTML. Hasilnya disimpan CDN beberapa menit,
 * jadi Supabase tidak dipanggil tiap kunjungan dan event yang diubah admin
 * tampil benar tanpa build ulang. Deploy baru mengosongkan cache ini.
 * Gagal ambil data = HTML dikirim apa adanya (tanpa disimpan), halaman tetap jalan.
 *
 * Gambarnya kartu bergaya poster dari build (/og/agenda/:slug.png,
 * /og/tanya/:slug.png; lihat app/lib/og-image.ts), tapi hanya kalau kegiatan
 * belum diubah sejak build (og/versions.json): kartu lama bisa memuat tanggal
 * yang sudah berubah. Selain itu poster dari admin, atau kartu komunitas.
 */
import type { Config, Context } from '@netlify/edge-functions';

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

/** Lama CDN menyimpan halaman: perubahan event tampil di preview paling lambat 5 menit. */
const CDN_CACHE = 'public, durable, s-maxage=300, stale-while-revalidate=86400';
const COMMUNITY_CARD = `${SITE_URL}/og/home.png`;

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

/** Path kartu → updated_at kegiatan saat kartu dibuat (scripts/og-images.mjs). Satu kali per deploy. */
let cardVersions: Promise<Record<string, string>> | undefined;
function getCardVersions(origin: string) {
  cardVersions ??= fetch(`${origin}/og/versions.json`, { signal: AbortSignal.timeout(2000) })
    .then((res) => (res.ok ? res.json() : {}))
    .catch(() => {
      cardVersions = undefined;
      return {};
    });
  return cardVersions;
}

/** Kartu build kalau masih sesuai isi kegiatan, kalau tidak kartu komunitas. */
const card = (path: string, a: Activity, versions: Record<string, string>) =>
  a.updated_at && versions[path] === a.updated_at ? ogImage(path, a.updated_at) : COMMUNITY_CARD;

type Preview = { title: string; description: string; url: string; image: string };

function eventPreview(a: Activity, versions: Record<string, string>): Preview {
  const start = a.starts_at ? new Date(a.starts_at) : null;
  const when = start ? `${wibDay.format(start)}, ${wibTime.format(start)} WIB` : 'Jadwal menyusul';
  const where = a.mode ? ` · ${a.mode[0].toUpperCase()}${a.mode.slice(1)}` : '';
  return {
    title: `${a.title} — SWE Growth`,
    description: `${when}${where}. ${a.summary || 'Kegiatan komunitas SWE Growth.'}`,
    url: `${SITE_URL}/agenda/${a.slug}`,
    // Poster dari admin diutamakan, sama dengan meta di routes/event.tsx.
    image: a.image_url || card(`/og/agenda/${a.slug}.png`, a, versions),
  };
}

/** Sama dengan qnaShareCopy() di app/lib/og.ts (dipakai routes/event-qna.tsx). */
const qnaPreview = (a: Activity, versions: Record<string, string>): Preview => ({
  title: `Tanya di sini: ${a.title} — SWE Growth`,
  description:
    a.qna_status === 'closed'
      ? `Sesi tanya jawab untuk ${a.speaker || 'pembicara'} sudah ditutup. Lihat pertanyaan yang masuk.`
      : `Kirim pertanyaan untuk ${a.speaker || 'pembicara'} dan vote pertanyaan yang paling ingin kamu dengar jawabannya.`,
  url: `${SITE_URL}/agenda/${a.slug}/tanya`,
  image: card(`/og/tanya/${a.slug}.png`, a, versions),
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
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/agenda\/([^/]+)(\/tanya)?\/?$/);
  if (!match) return;
  const [, slug, qna] = match;

  const [response, activity, versions] = await Promise.all([
    context.next(),
    fetchActivity(decodeURIComponent(slug)).catch(() => null),
    getCardVersions(url.origin),
  ]);
  const headers = new Headers(response.headers);
  if (!activity || !response.headers.get('content-type')?.includes('text/html')) {
    // Supabase lambat atau slug tidak ada: jangan simpan halaman tanpa meta.
    headers.set('Netlify-CDN-Cache-Control', 'no-store');
    return new Response(response.body, { status: response.status, headers });
  }

  const html = (await response.text())
    // Title & deskripsi default dari app shell diganti punya halaman ini.
    .replace(/<title>[^<]*<\/title>/, '')
    .replace(/<meta name="description"[^>]*>/, '')
    .replace('</head>', `${metaTags(qna ? qnaPreview(activity, versions) : eventPreview(activity, versions))}</head>`);

  headers.delete('content-length');
  headers.set('Netlify-CDN-Cache-Control', CDN_CACHE);
  return new Response(html, { status: response.status, headers });
}

export const config: Config = { pattern: '^/agenda/[^/]+(/tanya)?/?$', cache: 'manual' };
