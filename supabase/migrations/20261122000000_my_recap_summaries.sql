-- Daftar "Sudah kamu ikuti" di /portal/kegiatan: tanda "ringkasan" untuk kegiatan
-- yang sudah punya ringkasan sesi. Satu panggilan untuk seluruh daftar, hanya id
-- (isi ringkasan tetap lewat activity_recap per kegiatan). Aman dijalankan ulang.

create or replace function public.my_recap_summary_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select i.activity_id
  from public.activity_member_info i
  join public.activity_registrations r
    on r.activity_id = i.activity_id and r.user_id = auth.uid() and r.status <> 'cancelled'
  where nullif(trim(i.summary), '') is not null;
$$;

revoke all on function public.my_recap_summary_ids() from public;
grant execute on function public.my_recap_summary_ids() to authenticated;
revoke execute on function public.my_recap_summary_ids() from anon;
