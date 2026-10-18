# Berkontribusi

Terima kasih mau ikut membangun portal SWE Growth! Panduan singkat ini supaya kontribusimu cepat masuk.

## Sebelum mulai

- Baca [Kode Etik](CODE_OF_CONDUCT.md).
- Untuk perubahan besar (fitur baru, ubah skema database, ubah alur login), buka issue dulu untuk diskusi.
- Celah keamanan **jangan** lewat issue publik: lihat [SECURITY.md](SECURITY.md).

## Setup lokal

Butuh Node ≥ 22.22 (`nvm use` membaca `.nvmrc`).

```bash
cp .env.example .env   # isi dengan project Supabase milikmu sendiri
npm install
npm run dev            # http://localhost:4321
```

Tanpa `.env` aplikasi tetap jalan, tapi login dan data dari database tidak aktif. Untuk mencoba fitur yang butuh
database, buat project Supabase gratis sendiri lalu jalankan semua file di `supabase/migrations/` berurutan
(lihat bagian _Setup Supabase_ di [README](README.md)). Jangan minta akses ke database produksi.

## Alur kerja

1. Fork repo, lalu buat branch dari `develop` (mis. `fix/agenda-timezone`, `feat/filter-rekomendasi`).
2. Buat perubahan sekecil mungkin yang menyelesaikan satu hal.
3. Pastikan lolos sebelum push:

   ```bash
   npm run lint          # ESLint
   npm run format        # Prettier (format otomatis); CI memakai format:check
   npm run typecheck
   npm test              # Vitest
   npm run build
   # Kalau mengubah supabase/migrations atau app/lib/database.types.ts (butuh Postgres kosong + psql):
   DATABASE_URL=postgres://postgres@localhost:5432/postgres npm run check:db-types
   ```

4. Buka pull request ke `develop` dan isi template-nya. CI menjalankan lint, cek format, typecheck, test, build, dan mencocokkan `database.types.ts` dengan migration di setiap PR.
5. Semua PR direview maintainer sebelum di-merge. `main` hanya menerima merge dari `develop` saat rilis, dan
   itulah yang ter-deploy ke swegrowth.id.

## Konvensi

- **Bahasa**: teks UI, komentar kode, dan dokumentasi pakai Bahasa Indonesia yang santai tapi jelas, mengikuti gaya
  yang sudah ada.
- **Commit**: ringkas dan menjelaskan dampaknya, mis. `fix: agenda tidak menampilkan event hari ini`.
- **Tanpa data karangan**: jangan menambahkan angka, testimoni, atau data contoh palsu di UI. Bagian yang datanya
  kosong tidak ditampilkan.
- **Database**: perubahan skema selalu lewat file migration **baru** di `supabase/migrations/` dengan nama
  `YYYYMMDDHHMMSS_deskripsi.sql`. Jangan mengedit migration yang sudah di-merge. Tulis migration yang aman
  dijalankan ulang (`if not exists`, `create or replace`, `drop policy if exists`), aktifkan RLS untuk tabel baru,
  dan perbarui `app/lib/database.types.ts`.
- **Test**: logika murni (jadwal, format, validasi) diberi unit test di sebelah file-nya, mis.
  `app/lib/activities.test.ts`.
- **Secret**: tidak ada secret di kode client. Semua env `VITE_*` ikut ke browser.

## Lisensi

Dengan mengirim kontribusi, kamu setuju kontribusimu dirilis di bawah [lisensi repo ini](LICENSE).
