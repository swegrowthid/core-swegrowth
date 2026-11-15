-- Link meeting & rekaman (activity_member_info) hanya keluar lewat activity_links(),
-- yang memeriksa status pendaftaran dan baru membuka link meeting 1 jam sebelum acara.
-- Policy lama masih mengizinkan member aktif membaca tabelnya langsung, melewati
-- pemeriksaan itu. Aplikasi tidak pernah membaca tabel ini selain dari editor admin
-- (policy "Admins manage event info" tetap ada). Aman dijalankan ulang.

drop policy if exists "Members read event info" on public.activity_member_info;
