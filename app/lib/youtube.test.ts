import { describe, expect, it } from 'vitest';
import { parseChannelFeed, youtubeId } from './youtube';

describe('youtubeId', () => {
  it('membaca semua bentuk link YouTube', () => {
    for (const url of [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ?si=abc',
      'https://m.youtube.com/live/dQw4w9WgXcQ',
      'https://youtube.com/shorts/dQw4w9WgXcQ',
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    ]) {
      expect(youtubeId(url)).toBe('dQw4w9WgXcQ');
    }
  });

  it('menolak link lain atau ID tidak valid', () => {
    expect(youtubeId('https://vimeo.com/123')).toBeNull();
    expect(youtubeId('https://youtube.com/watch?v=pendek')).toBeNull();
    expect(youtubeId('bukan url')).toBeNull();
    expect(youtubeId(null)).toBeNull();
  });
});

describe('parseChannelFeed', () => {
  it('mengambil ID, judul (entity didekode), dan tanggal tiap video', () => {
    const xml = `<feed><title>SWE Growth</title>
      <entry><yt:videoId>dQw4w9WgXcQ</yt:videoId><title>Ngobrol &amp; &quot;sharing&quot;</title><published>2026-09-21T03:00:00+00:00</published></entry>
      <entry><yt:videoId>rusak</yt:videoId><title>Tanpa ID valid</title><published>2026-09-20T03:00:00+00:00</published></entry>
    </feed>`;
    expect(parseChannelFeed(xml)).toEqual([
      { videoId: 'dQw4w9WgXcQ', title: 'Ngobrol & "sharing"', published: '2026-09-21T03:00:00+00:00' },
    ]);
  });

  it('mengembalikan daftar kosong untuk respons yang bukan feed', () => {
    expect(parseChannelFeed('<!doctype html><html></html>')).toEqual([]);
  });
});
