-- Loker: catatan relevansi saat menandai tertarik, nomor WA yang membagikan untuk
-- dihubungi (hanya jika ia bersedia ditanya), dan tandai sudah tutup oleh yang
-- membagikan. Aman dijalankan ulang.

alter table public.job_interests add column if not exists note text not null default '';
alter table public.job_interests drop constraint if exists job_interests_note_check;
alter table public.job_interests add constraint job_interests_note_check check (char_length(note) <= 600);

-- Tertarik + catatan. Mengembalikan nomor WA yang membagikan kalau ia mencentang
-- "Bisa ditanya" dan namanya tampil; null kalau tidak (hubungi lewat CP saja).
create or replace function public.express_job_interest(p_job_id uuid, p_note text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_note text := trim(coalesce(p_note, ''));
  v_job public.jobs;
  v_wa text;
begin
  if v_uid is null then
    raise exception 'Silakan masuk terlebih dahulu.' using errcode = '28000';
  end if;
  if not public.has_complete_profile() then
    raise exception 'Lengkapi profil terlebih dahulu agar yang membagikan lowongan dapat mengenal Anda.' using errcode = '42501';
  end if;
  if char_length(v_note) < 40 or char_length(v_note) > 600 then
    raise exception 'Jelaskan relevansi pengalaman Anda dalam 40–600 karakter.' using errcode = '22023';
  end if;
  select * into v_job from public.jobs where id = p_job_id and status = 'approved';
  if not found then
    raise exception 'Lowongan ini sudah tidak tayang.' using errcode = '22023';
  end if;

  insert into public.job_interests (job_id, user_id, note) values (p_job_id, v_uid, v_note)
  on conflict (job_id, user_id) do update set note = excluded.note;

  if v_job.open_to_questions and v_job.show_submitter then
    select p.whatsapp into v_wa
    from public.profiles p
    where p.id = coalesce(v_job.owner_id, v_job.submitted_by)
      and p.onboarded_at is not null and coalesce(p.full_name, '') <> '';
  end if;
  return nullif(v_wa, '');
end;
$$;

revoke all on function public.express_job_interest(uuid, text) from public;
grant execute on function public.express_job_interest(uuid, text) to authenticated;
revoke execute on function public.express_job_interest(uuid, text) from anon;

-- Daftar peminat + catatannya.
drop function if exists public.job_interested(uuid);

create function public.job_interested(p_job_id uuid)
returns table (
  user_id uuid,
  full_name text,
  handle text,
  avatar_url text,
  headline text,
  seniority public.seniority,
  company text,
  tech_stack text[],
  whatsapp text,
  linkedin_url text,
  note text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.full_name, coalesce(p.username, p.id::text), p.avatar_url, p.headline, p.seniority, p.company,
         p.tech_stack, p.whatsapp, p.linkedin_url, i.note, i.created_at
  from public.job_interests i
  join public.profiles p on p.id = i.user_id
  join public.jobs j on j.id = i.job_id
  where i.job_id = p_job_id
    and (j.owner_id = auth.uid() or j.submitted_by = auth.uid() or public.is_job_poster())
  order by i.created_at;
$$;

revoke all on function public.job_interested(uuid) from public;
grant execute on function public.job_interested(uuid) to authenticated;
revoke execute on function public.job_interested(uuid) from anon;

-- Yang membagikan (pemilik/pengirim) atau tim loker menandai lowongan sudah tutup:
-- turun dari direktori dengan alasan "kedaluwarsa"; daftar peminat tetap ada.
create or replace function public.close_job(p_job_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  with closed as (
    update public.jobs
    set status = 'hidden', reject_reason = 'kedaluwarsa'
    where id = p_job_id
      and status = 'approved'
      and auth.uid() is not null
      and (owner_id = auth.uid() or submitted_by = auth.uid() or public.is_job_poster())
    returning 1
  )
  select exists (select 1 from closed);
$$;

revoke all on function public.close_job(uuid) from public;
grant execute on function public.close_job(uuid) to authenticated;
revoke execute on function public.close_job(uuid) from anon;
