import TurndownService from 'turndown';

let service: TurndownService | null = null;

/**
 * Teks berformat dari clipboard (halaman ringkasan Zoom, email, Google Docs)
 * jadi markdown, supaya bold, link, judul, dan daftar tidak hilang saat ditempel
 * ke textarea. Hasilnya dirender lagi dengan marked + DOMPurify (SessionSummary).
 */
export function htmlToMarkdown(html: string) {
  service ??= createService();
  return service
    .turndown(html)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function createService() {
  const td = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-', codeBlockStyle: 'fenced', emDelimiter: '_' });
  td.remove(['style', 'script', 'meta', 'title']);
  // Google Docs membungkus semua isi dengan <b style="font-weight:normal">; itu bukan bold.
  td.addRule('docsWrapper', {
    filter: (node) => node.nodeName === 'B' && /font-weight:\s*(normal|400)/.test(node.getAttribute('style') ?? ''),
    replacement: (content) => content,
  });
  // Bold lewat style (Zoom, Docs) tanpa <strong>.
  td.addRule('styledBold', {
    filter: (node) => node.nodeName === 'SPAN' && /font-weight:\s*(bold|[6-9]00)/.test(node.getAttribute('style') ?? ''),
    replacement: (content) => (content.trim() ? `**${content.trim()}**` : content),
  });
  // "- item" (bawaan turndown "-   item"), lebih rapi dibaca di textarea.
  td.addRule('listItem', {
    filter: 'li',
    replacement: (content, node, options) => {
      const parent = node.parentNode as HTMLElement | null;
      const body = content.replace(/^\n+/, '').replace(/\n+$/, '\n').replace(/\n/gm, '\n   ');
      let prefix = `${options.bulletListMarker} `;
      if (parent?.nodeName === 'OL') {
        const start = Number(parent.getAttribute('start') ?? 1);
        prefix = `${start + Array.prototype.indexOf.call(parent.children, node)}. `;
      }
      return prefix + body + (node.nextSibling && !/\n$/.test(body) ? '\n' : '');
    },
  });
  return td;
}
