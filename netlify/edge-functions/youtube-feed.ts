/**
 * Feed video terbaru channel YouTube SWE Growth untuk galeri rekaman.
 *
 * Browser tidak bisa membaca feed YouTube langsung (CORS), jadi edge function
 * ini meneruskannya apa adanya dan menyimpannya di cache CDN supaya YouTube
 * tidak dipanggil tiap kunjungan. Parsing ada di app/lib/youtube.ts.
 */
import type { Config } from '@netlify/edge-functions';

const CHANNEL_ID = 'UCS_PPsVlRw6PX2HEDCBd7lA';
const FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;

export default async () => {
  try {
    const res = await fetch(FEED_URL, { signal: AbortSignal.timeout(8000) });
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
