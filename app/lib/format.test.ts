import { describe, expect, it } from 'vitest';
import { relativeFromNow } from './format';

describe('relativeFromNow', () => {
  it('memakai hari kalender WIB, bukan selisih 24 jam', () => {
    const pagi = new Date('2026-11-20T07:00:00+07:00');
    expect(relativeFromNow('2026-11-20T20:00:00+07:00', pagi)).toBe('hari ini');
    expect(relativeFromNow('2026-11-21T08:00:00+07:00', pagi)).toBe('besok');
    expect(relativeFromNow('2026-11-23T19:30:00+07:00', pagi)).toBe('3 hari lagi');
  });

  it('tengah malam WIB tetap ganti hari walau jam UTC masih kemarin', () => {
    const malam = new Date('2026-11-20T23:30:00+07:00');
    expect(relativeFromNow('2026-11-21T00:30:00+07:00', malam)).toBe('besok');
    expect(relativeFromNow('2026-11-19T21:00:00+07:00', malam)).toBe('1 hari lalu');
  });
});
