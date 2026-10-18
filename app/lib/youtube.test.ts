import { describe, expect, it } from 'vitest';
import { youtubeId } from './youtube';

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
