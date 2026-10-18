/**
 * Feed video terbaru channel YouTube SWE Growth untuk galeri rekaman.
 *
 * Browser tidak bisa membaca feed YouTube langsung (CORS), jadi edge function
 * ini meneruskannya apa adanya dan menyimpannya di cache CDN supaya YouTube
 * tidak dipanggil tiap kunjungan. Parsing ada di app/lib/youtube.ts.
 * Channel diatur lewat env VITE_YOUTUBE_CHANNEL_ID (sama dengan yang dipakai build).
 */
import type { Config } from '@netlify/edge-functions';

const DEFAULT_CHANNEL_ID = 'UCf_Vj2VGiqAdHvqVfHVuU6A';

export default async () => {
  const channelId = Netlify.env.get('VITE_YOUTUBE_CHANNEL_ID') || DEFAULT_CHANNEL_ID;
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
  try {
    const res = await fetch(feedUrl, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return new Response('', { status: 502 });
    return new Response(await res.text(), {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=600',
        // Video baru muncul paling lambat sejam setelah diunggah.
        'Netlify-CDN-Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch {
    return new Response('', { status: 502 });
  }
};

export const config: Config = { path: '/api/youtube-feed', cache: 'manual' };
