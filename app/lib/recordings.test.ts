import { describe, expect, it } from 'vitest';
import { mergeRecordings, recordingsFrom, type Recording } from './recordings';

const rec = (videoId: string, date: string, patch: Partial<Recording> = {}): Recording => ({
  key: videoId,
  title: `Video ${videoId}`,
  videoId,
  date,
  monthOnly: false,
  eventPath: null,
  ...patch,
});

describe('mergeRecordings', () => {
  const snapshot = [rec('aaaaaaaaaaa', '2026-10-01'), rec('bbbbbbbbbbb', '2026-09-01'), rec('ccccccccccc', '2026-08-01')];

  it('daftar browser yang tidak lengkap dilengkapi snapshot, jadi tidak menyusut', () => {
    const live = [rec('bbbbbbbbbbb', '2026-09-01', { title: 'Judul event', eventPath: '/agenda/x' })];
    const merged = mergeRecordings(live, snapshot);
    expect(merged.map((r) => r.videoId)).toEqual(['aaaaaaaaaaa', 'bbbbbbbbbbb', 'ccccccccccc']);
    // Versi dari browser yang menang untuk video yang sama.
    expect(merged[1].eventPath).toBe('/agenda/x');
  });

  it('video baru dari browser ikut masuk, terbaru dulu', () => {
    const merged = mergeRecordings([rec('ddddddddddd', '2026-11-01')], snapshot);
    expect(merged.map((r) => r.videoId)).toEqual(['ddddddddddd', 'aaaaaaaaaaa', 'bbbbbbbbbbb', 'ccccccccccc']);
  });
});

describe('recordingsFrom', () => {
  it('feed channel yang kosong tidak menghapus apa pun; video yang sama tidak dobel', () => {
    const channel = [
      { videoId: 'aaaaaaaaaaa', title: 'A', published: '2026-10-01T00:00:00+00:00' },
      { videoId: 'aaaaaaaaaaa', title: 'A lagi', published: '2026-10-02T00:00:00+00:00' },
    ];
    expect(recordingsFrom([], channel).map((r) => r.videoId)).toEqual(['aaaaaaaaaaa']);
    expect(recordingsFrom([], [])).toEqual([]);
  });
});
