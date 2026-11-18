import { describe, expect, it } from 'vitest';
import { htmlToMarkdown } from './html-to-markdown';

describe('htmlToMarkdown', () => {
  it('bold, link, judul, dan daftar dari ringkasan Zoom tetap ada', () => {
    const html =
      '<h3>Ringkasan cepat</h3><p>Sesi membahas <strong>system design</strong> untuk <a href="https://contoh.id/x">payment</a>.</p>' +
      '<h3>Langkah selanjutnya</h3><ul><li><b>Rina</b> membagikan slide</li><li>Budi menyiapkan repo</li></ul>';
    expect(htmlToMarkdown(html)).toBe(
      '### Ringkasan cepat\n\nSesi membahas **system design** untuk [payment](https://contoh.id/x).\n\n### Langkah selanjutnya\n\n- **Rina** membagikan slide\n- Budi menyiapkan repo',
    );
  });

  it('daftar bernomor dan bertingkat', () => {
    expect(htmlToMarkdown('<ol><li>Satu</li><li>Dua<ul><li>Anak</li></ul></li></ol>')).toBe('1. Satu\n2. Dua\n   - Anak');
  });

  it('pembungkus Google Docs bukan bold; bold lewat style tetap bold', () => {
    const html = '<b style="font-weight:normal" id="docs-internal-guid-1"><p>Biasa dan <span style="font-weight:700">tebal</span></p></b>';
    expect(htmlToMarkdown(html)).toBe('Biasa dan **tebal**');
  });
});
