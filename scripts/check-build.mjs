// Dijalankan setelah `npm run build` (CI): memastikan hasil build layak tayang.
// - tiap halaman publik ter-prerender dan berisi konten (bukan kerangka kosong);
// - semua file /assets/* yang dirujuk HTML memang ada di hasil build;
// - netlify.toml tetap membalas 404 untuk /assets/* dan /api/* yang tidak ada,
//   supaya file lama tidak dibalas app shell (HTML) dan halaman tampil tanpa gaya.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = 'build/client';
const PAGES = ['/', '/tentang', '/agenda', '/rekaman', '/rekomendasi', '/code-of-conduct', '/privasi', '/term-of-service'];
const errors = [];

if (!existsSync(OUT)) {
  console.error(`✖ ${OUT} tidak ada. Jalankan \`npm run build\` dulu.`);
  process.exit(1);
}

const htmlFiles = [...PAGES.map((p) => join(OUT, p, 'index.html')), join(OUT, '__spa-fallback.html')];
for (const file of htmlFiles) {
  if (!existsSync(file)) {
    errors.push(`${file}: tidak ter-prerender`);
    continue;
  }
  const html = readFileSync(file, 'utf8');
  if (!file.endsWith('__spa-fallback.html') && !/<h1[\s>]/.test(html)) errors.push(`${file}: tidak ada <h1>, isi halaman kosong?`);
  if (!/<script[^>]+type="module"/.test(html)) errors.push(`${file}: tidak memuat JavaScript aplikasi`);
  for (const [, ref] of html.matchAll(/["'(](\/assets\/[\w./-]+)/g)) {
    if (!existsSync(join(OUT, ref))) errors.push(`${file}: merujuk ${ref} yang tidak ada di hasil build`);
  }
}

const netlify = readFileSync('netlify.toml', 'utf8');
for (const path of ['/assets/*', '/api/*']) {
  const rule = new RegExp(`from = "${path.replace(/[/*]/g, '\\$&')}"\\s+to = "[^"]+"\\s+status = 404`);
  if (!rule.test(netlify)) errors.push(`netlify.toml: aturan 404 untuk ${path} hilang`);
}
if (netlify.indexOf('from = "/assets/*"') > netlify.lastIndexOf('from = "/*"')) {
  errors.push('netlify.toml: aturan 404 /assets/* harus di atas aturan SPA "/*"');
}

if (errors.length > 0) {
  console.error(`✖ Hasil build bermasalah:\n${errors.map((e) => `  - ${e}`).join('\n')}`);
  process.exit(1);
}
console.log(`✓ Hasil build: ${htmlFiles.length} halaman dan semua aset yang dirujuk ada.`);
