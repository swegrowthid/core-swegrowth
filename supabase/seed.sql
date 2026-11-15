-- Data contoh untuk pengembangan lokal, supaya halaman tidak kosong di project
-- Supabase milikmu sendiri. JANGAN dijalankan di database produksi.
--
-- Jalankan setelah semua migration: tempel di SQL editor Supabase, atau
--   psql "$DATABASE_URL" -f supabase/seed.sql
-- Semua isinya karangan (judul berawalan "[Contoh]") dan tanggalnya relatif
-- terhadap hari ini, jadi agenda selalu punya sesi yang akan datang dan yang lewat.
-- Aman dijalankan ulang: baris yang sudah ada dilewati.
--
-- Supaya bisa membuka /admin, tambahkan email akun Google-mu sendiri:
--   insert into public.activity_admin_emails (email) values ('kamu@example.com');

insert into public.community_groups (slug, name, description, sort_order) values
  ('contoh-english-club', '[Contoh] English Club', 'Latihan ngobrol bahasa Inggris tiap minggu.', 1),
  ('contoh-ai-tools', '[Contoh] AI Tools', 'Berbagi cara pakai AI coding tools.', 2)
on conflict (slug) do nothing;

insert into public.activities
  (slug, title, summary, description, status, mode, location, speaker, speaker_title, capacity, starts_at, ends_at, highlights, organizer_group_id, youtube_url)
values
  (
    'contoh-community-talks',
    '[Contoh] Community Talks: karier software engineer',
    'Sesi ngobrol santai soal karier. Data contoh untuk pengembangan lokal.',
    'Deskripsi contoh. Ganti lewat /admin setelah emailmu masuk daftar admin.',
    'registration_open', 'online', null, 'Pembicara Contoh', 'Engineering Manager', 100,
    date_trunc('day', now()) + interval '7 days 12 hours', date_trunc('day', now()) + interval '7 days 13 hours 30 minutes',
    array['Cara memilih jalur karier', 'Tanya jawab'], null, null
  ),
  (
    'contoh-kopdar',
    '[Contoh] Kopdar offline',
    'Ketemu langsung sesama member. Kuotanya sudah penuh, jadi tombolnya masuk waitlist.',
    'Deskripsi contoh.',
    'full', 'offline', 'Jakarta', null, null, 20,
    date_trunc('day', now()) + interval '14 days 3 hours', date_trunc('day', now()) + interval '14 days 6 hours',
    '{}', null, null
  ),
  (
    'contoh-english-club-mingguan',
    '[Contoh] English Club mingguan',
    'Belum ada jadwal; contoh event berstatus coming soon dari subgrup.',
    'Deskripsi contoh.',
    'coming_soon', 'online', null, null, null, null,
    null, null,
    '{}', (select id from public.community_groups where slug = 'contoh-english-club'), null
  ),
  (
    'contoh-sesi-lalu',
    '[Contoh] Sesi yang sudah lewat',
    'Contoh kegiatan lalu yang punya rekaman, tampil di /rekaman dan tab Kegiatan lalu.',
    'Deskripsi contoh.',
    'completed', 'online', null, 'Pembicara Contoh', null, null,
    date_trunc('day', now()) - interval '20 days' + interval '12 hours', date_trunc('day', now()) - interval '20 days' + interval '13 hours',
    '{}', (select id from public.community_groups where slug = 'contoh-ai-tools'), 'https://www.youtube.com/watch?v=wjtEsnrqplA'
  )
on conflict (slug) do nothing;

insert into public.recommendations (category, title, url, reason, organizer, price, language, is_featured, event_date, event_mode, location)
select v.category, v.title, v.url, v.reason, v.organizer, v.price, v.language, v.is_featured, v.event_date, v.event_mode, v.location
from (values
  ('buku', '[Contoh] Buku rekomendasi', 'https://example.com/contoh-buku', 'Alasan contoh kenapa buku ini layak dibaca software engineer.', 'Penulis Contoh', 'berbayar', 'en', true, null::date, null, ''),
  ('course', '[Contoh] Course gratis', 'https://example.com/contoh-course', 'Alasan contoh kenapa course ini cocok untuk yang baru mulai.', 'Penyelenggara Contoh', 'gratis', 'id', true, null::date, null, ''),
  ('acara', '[Contoh] Konferensi dari luar', 'https://example.com/contoh-acara', 'Alasan contoh: acara pihak lain yang layak didatangi.', 'Komunitas Contoh', 'gratis', 'id', false, (now() + interval '30 days')::date, 'offline', 'Bandung')
) as v (category, title, url, reason, organizer, price, language, is_featured, event_date, event_mode, location)
where not exists (select 1 from public.recommendations r where r.url = v.url);

insert into public.whatsapp_groups (name, description, invite_url, sort_order)
select v.name, v.description, v.invite_url, v.sort_order
from (values
  ('[Contoh] Backend', 'Grup contoh; link-nya tidak mengarah ke grup sungguhan.', 'https://example.com/contoh-grup-backend', 1),
  ('[Contoh] Frontend', 'Grup contoh; link-nya tidak mengarah ke grup sungguhan.', 'https://example.com/contoh-grup-frontend', 2)
) as v (name, description, invite_url, sort_order)
where not exists (select 1 from public.whatsapp_groups g where g.invite_url = v.invite_url);
