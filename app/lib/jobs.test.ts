import { describe, expect, it } from 'vitest';
import { companyLabel, contactHref, matchMember, postedAgo } from './jobs';

describe('contactHref', () => {
  it('nomor HP Indonesia jadi link WhatsApp', () => {
    expect(contactHref('0812-3456-7890')).toBe('https://wa.me/6281234567890');
    expect(contactHref('+62 812 3456 7890')).toBe('https://wa.me/6281234567890');
    expect(contactHref('6281234567890')).toBe('https://wa.me/6281234567890');
  });

  it('email jadi mailto, URL https apa adanya', () => {
    expect(contactHref('hr@perusahaan.com')).toBe('mailto:hr@perusahaan.com');
    expect(contactHref('https://linkedin.com/in/rina')).toBe('https://linkedin.com/in/rina');
  });

  it('bentuk lain cukup jadi teks', () => {
    expect(contactHref('@rina di grup')).toBeNull();
    expect(contactHref('http://contoh.com')).toBeNull();
    expect(contactHref('021-555-1234')).toBeNull();
  });
});

describe('companyLabel', () => {
  it('pakai keterangan kalau perusahaan tidak disebut', () => {
    expect(companyLabel('')).toBe('Perusahaan tidak disebut');
    expect(companyLabel('Vision AI')).toBe('Vision AI');
  });
});

describe('matchMember', () => {
  const members = [
    { id: '1', full_name: 'Budi Santoso' },
    { id: '2', full_name: 'Budi Hartono' },
    { id: '3', full_name: 'Rina Kartika' },
    { id: '4', full_name: 'Zikrul Ihsan' },
  ];

  it('nama sama persis (abaikan huruf besar & tanda baca)', () => {
    expect(matchMember('rina kartika', members)?.id).toBe('3');
    expect(matchMember('Zikrul Ihsan 🚀', members)?.id).toBe('4');
  });

  it('nama WA yang disingkat tetap cocok kalau hanya satu member', () => {
    expect(matchMember('Rina', members)?.id).toBe('3');
    expect(matchMember('Budi S', members)?.id).toBe('1');
  });

  it('tidak menebak kalau lebih dari satu atau tidak ada yang cocok', () => {
    expect(matchMember('Budi', members)).toBeNull();
    expect(matchMember('Andi', members)).toBeNull();
    expect(matchMember('', members)).toBeNull();
  });
});

describe('postedAgo', () => {
  const now = new Date('2026-11-18T10:00:00+07:00');

  it('hari ini, kemarin, beberapa hari lalu (hari kalender WIB)', () => {
    expect(postedAgo('2026-11-18T00:30:00+07:00', now)).toBe('hari ini');
    expect(postedAgo('2026-11-17T23:50:00+07:00', now)).toBe('kemarin');
    expect(postedAgo('2026-11-15T09:00:00+07:00', now)).toBe('3 hari lalu');
  });

  it('lebih dari dua minggu jadi tanggal', () => {
    expect(postedAgo('2026-10-20T09:00:00+07:00', now)).not.toMatch(/lalu/);
  });
});
