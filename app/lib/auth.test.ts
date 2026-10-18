import { describe, expect, it } from 'vitest';
import { initials, safeNext } from './auth';

describe('safeNext', () => {
  it('menerima path internal', () => {
    expect(safeNext('/agenda/kelas-git')).toBe('/agenda/kelas-git');
    expect(safeNext('/portal?tab=profil#x')).toBe('/portal?tab=profil#x');
  });

  it('menolak URL yang dibaca browser sebagai domain lain', () => {
    expect(safeNext('https://evil.example')).toBe('/portal');
    expect(safeNext('//evil.example')).toBe('/portal');
    expect(safeNext('/\\evil.example')).toBe('/portal');
    expect(safeNext('javascript:alert(1)')).toBe('/portal');
  });

  it('memakai fallback untuk nilai kosong', () => {
    expect(safeNext(null)).toBe('/portal');
    expect(safeNext('', '/admin')).toBe('/admin');
  });
});

describe('initials', () => {
  it('mengambil huruf depan nama', () => {
    expect(initials('Ruby Abdullah')).toMatch(/^RA$/);
  });
});
