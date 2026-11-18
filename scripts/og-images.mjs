// Dijalankan setelah build (postbuild): gambar preview link (og:image) untuk
// beranda, agenda, tiap kegiatan, dan tanya jawabnya → build/client/og/.
// Gambarnya dibuat app/lib/og-image.ts dengan canvas Node (@napi-rs/canvas),
// kode gambar yang sama gayanya dengan poster event di admin.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createCanvas, GlobalFonts, loadImage, Path2D } from '@napi-rs/canvas';
import { loadEnv, runnerImport } from 'vite';

const root = process.cwd();
const out = join(root, 'build/client');
// Sama dengan react-router.config.ts: .env lokal belum ada di process.env.
Object.assign(process.env, { ...loadEnv('production', root, 'VITE_'), ...process.env });

// Ikon poster memakai Path2D global seperti di browser.
globalThis.Path2D = Path2D;
GlobalFonts.registerFromPath(
  join(root, 'node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2'),
  'Plus Jakarta Sans',
);

const { module } = await runnerImport('/app/lib/og-jobs.ts', {
  configFile: false,
  root,
  mode: 'production',
  resolve: { tsconfigPaths: true },
  logLevel: 'warn',
});
const { ogJobs, OG_W, OG_H } = module;

const logo = await loadImage(join(root, 'public/assets/swe-growth-logo.png'));
const jobs = await ogJobs();

// Satu gambar gagal tidak menggagalkan deploy: link-nya jatuh ke kartu komunitas (netlify.toml).
let done = 0;
const versions = {};
for (const job of jobs) {
  try {
    const canvas = createCanvas(OG_W, OG_H);
    job.draw(canvas.getContext('2d'), logo);
    const file = join(out, job.path);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, await canvas.encode('png'));
    if (job.version) versions[job.path] = job.version;
    done++;
  } catch (error) {
    console.warn(`⚠ Gagal membuat ${job.path}:`, error);
  }
}
// Dibaca edge function event-preview: kartu kegiatan yang diubah setelah build tidak dipakai.
await mkdir(join(out, 'og'), { recursive: true });
await writeFile(join(out, 'og/versions.json'), JSON.stringify(versions));
console.log(`✓ ${done}/${jobs.length} gambar preview link di build/client/og/`);
