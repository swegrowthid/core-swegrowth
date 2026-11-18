import { describe, expect, it } from 'vitest';
import { companyLabel, contactHref } from './jobs';

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
