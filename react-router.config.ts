import type { Config } from '@react-router/dev/config';

/**
 * Tidak ada server runtime: halaman publik di-prerender jadi HTML saat build
 * (bagus untuk SEO & share link), sisanya — portal member dan admin — jalan
 * sebagai SPA lewat __spa-fallback.html. Detail kegiatan tidak di-prerender:
 * isinya dimuat di browser dan meta preview-nya disisipkan edge function
 * event-preview, jadi menyimpan event tidak perlu build ulang.
 */
export default {
  ssr: false,
  prerender() {
    return ['/', '/tentang', '/agenda', '/rekaman', '/rekomendasi', '/loker', '/code-of-conduct', '/privasi', '/term-of-service'];
  },
} satisfies Config;
