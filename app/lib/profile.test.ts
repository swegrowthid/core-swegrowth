import { describe, expect, it } from 'vitest';
import { isLinkedinUrl, normalizeUrl, parseTags, waNumber } from './profile';

describe('profile helpers', () => {
  it('waNumber mengubah 08… jadi 628…', () => {
    expect(waNumber('0812-3456 789')).toBe('628123456789');
    expect(waNumber('+62 812 3456 789')).toBe('628123456789');
  });

  it('parseTags membuang duplikat tanpa peduli huruf besar-kecil', () => {
    expect(parseTags('React, react,  Go\nRust,,')).toEqual(['React', 'Go', 'Rust']);
    expect(parseTags('a,b,c', 2)).toEqual(['a', 'b']);
  });

  it('normalizeUrl selalu https', () => {
    expect(normalizeUrl(' linkedin.com/in/x ')).toBe('https://linkedin.com/in/x');
    expect(normalizeUrl('http://example.com')).toBe('https://example.com');
    expect(normalizeUrl('  ')).toBeNull();
  });

  it('isLinkedinUrl', () => {
    expect(isLinkedinUrl('https://id.linkedin.com/in/ruby')).toBe(true);
    expect(isLinkedinUrl('https://linkedin.com/company/x')).toBe(false);
    expect(isLinkedinUrl(null)).toBe(false);
  });
});
