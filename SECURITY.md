# Kebijakan Keamanan

## Melaporkan celah keamanan

**Jangan buka issue publik** untuk celah keamanan. Laporkan secara privat lewat
[GitHub Security Advisories](https://github.com/zikrulihsan/core-swegrowth/security/advisories/new)
(tab **Security → Report a vulnerability**).

Sertakan:

- Bagian yang terdampak (route, fungsi SQL/RLS, edge function, dsb.).
- Langkah reproduksi atau proof of concept.
- Dampak yang kamu perkirakan (data apa yang bisa dibaca/diubah, oleh siapa).

Kami akan membalas secepatnya, memperbaiki di branch privat, lalu mempublikasikan advisory setelah perbaikan
ter-deploy. Terima kasih sudah melapor secara bertanggung jawab.

## Cakupan

Versi yang didukung hanya yang sedang berjalan di [swegrowth.id](https://swegrowth.id) (branch `main`).

Yang paling penting dijaga:

- **Row Level Security** di `supabase/migrations/`: semua hak akses data ada di sini, karena aplikasi tidak punya
  server sendiri. Member tidak boleh bisa membaca email/WhatsApp member lain, link meeting event yang tidak dia
  ikuti, atau data admin.
- **Edge functions** di `supabase/functions/` (`app-handoff`, `calendar-sync`): verifikasi JWT, daftar origin
  yang diizinkan, dan pemakaian service-role key.
- **Alur login** (`app/lib/auth.tsx`, `app/routes/auth-*.tsx`): nonce, `state`, dan validasi `next` (open redirect).

Di luar cakupan: laporan dari scanner otomatis tanpa dampak nyata, rate limiting bawaan Supabase/Netlify, dan
serangan yang butuh akses fisik ke perangkat korban.

## Untuk kontributor

- Jangan pernah commit `.env`, service-role key, refresh token Google, atau secret lain. Hanya nilai yang memang
  publik (`VITE_SUPABASE_URL`, publishable key, Google client ID) yang boleh ada di client.
- Secret server disimpan di Supabase (`supabase secrets set`), bukan di repo.
- Setiap tabel baru wajib `enable row level security` beserta policy-nya di migration yang sama.
