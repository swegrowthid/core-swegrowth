-- Direktori loker dari grup loker komunitas.
--
-- Dua peran:
--   - Tim loker (job_posters, ditunjuk admin; admin selalu termasuk): loker yang
--     dimasukkan langsung tayang, dan bisa mereview rekomendasi member.
--   - Member dengan profil lengkap: merekomendasikan loker, antre review dulu.
--
-- Publik membaca lewat published_jobs(); semua yang masuk lewat submit_job().
-- Tabelnya sendiri hanya terbaca pemilik kiriman & tim loker.
-- Aman dijalankan ulang.

-- ---------------------------------------------------------------------------
-- Tim loker
-- ---------------------------------------------------------------------------

create table if not exists public.job_posters (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  added_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.job_posters enable row level security;

drop policy if exists "Admins manage job posters" on public.job_posters;
create policy "Admins manage job posters" on public.job_posters
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

grant select, insert, delete on public.job_posters to authenticated;

create or replace function public.is_job_poster()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin() or exists (select 1 from public.job_posters j where j.user_id = auth.uid());
$$;

revoke all on function public.is_job_poster() from public;
grant execute on function public.is_job_poster() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Loker
-- ---------------------------------------------------------------------------

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 120),
  company text not null check (char_length(company) between 1 and 120),
  -- Link lamaran atau email HR (mailto:), seperti yang biasa dibagikan di grup.
  apply_url text not null check (apply_url ~ '^(https://|mailto:)'),
  description text not null check (char_length(description) between 10 and 1000),
  employment_type text not null default 'full_time'
    check (employment_type in ('full_time', 'contract', 'internship', 'freelance', 'part_time')),
  work_mode text not null default 'onsite' check (work_mode in ('onsite', 'hybrid', 'remote')),
  location text not null default '' check (char_length(location) <= 80),
  level text check (level in ('entry', 'junior', 'mid', 'senior', 'lead')),
  salary text not null default '' check (char_length(salary) <= 80),
  -- Batas lamaran (yyyy-mm-dd); lewat = tidak tampil. Tanpa batas: tampil 45 hari.
  deadline date,
  source text not null default 'member' check (source in ('poster', 'member')),
  submitted_by uuid references public.profiles (id) on delete set null,
  show_submitter boolean not null default true,
  -- Hubungan pengirim dengan lokernya: yang hiring, orang dalam (bisa referral),
  -- atau sekadar meneruskan info dari grup.
  submitter_relation text not null default 'share' check (submitter_relation in ('hiring', 'insider', 'share')),
  -- Pengirim bersedia ditanya-tanya soal loker ini (lewat profil publiknya).
  open_to_questions boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'hidden')),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  reject_reason text check (reject_reason in ('duplikat', 'kedaluwarsa', 'kurang_relevan', 'kurang_lengkap', 'mencurigakan')),
  reject_note text not null default '' check (char_length(reject_note) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists jobs_status_idx on public.jobs (status);
create index if not exists jobs_submitted_by_idx on public.jobs (submitted_by);

drop trigger if exists jobs_touch on public.jobs;
create trigger jobs_touch before update on public.jobs
  for each row execute function public.touch_updated_at();

alter table public.jobs enable row level security;

drop policy if exists "Job posters manage jobs" on public.jobs;
create policy "Job posters manage jobs" on public.jobs
  for all to authenticated
  using ((select public.is_job_poster()))
  with check ((select public.is_job_poster()));

drop policy if exists "Members read own jobs" on public.jobs;
create policy "Members read own jobs" on public.jobs
  for select to authenticated
  using (submitted_by = (select auth.uid()));

drop policy if exists "Members withdraw pending jobs" on public.jobs;
create policy "Members withdraw pending jobs" on public.jobs
  for delete to authenticated
  using (submitted_by = (select auth.uid()) and status = 'pending');

grant select, insert, update, delete on public.jobs to authenticated;

-- ---------------------------------------------------------------------------
-- Direktori publik: hanya yang tayang dan masih buka.
-- Nama, handle, & foto pengirim hanya kalau ia mengizinkan dan profilnya publik.
-- ---------------------------------------------------------------------------

create or replace function public.published_jobs()
returns table (
  id uuid,
  title text,
  company text,
  apply_url text,
  description text,
  employment_type text,
  work_mode text,
  location text,
  level text,
  salary text,
  deadline date,
  source text,
  submitter_relation text,
  open_to_questions boolean,
  submitter_name text,
  submitter_handle text,
  submitter_avatar_url text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select j.id, j.title, j.company, j.apply_url, j.description, j.employment_type, j.work_mode, j.location,
         j.level, j.salary, j.deadline, j.source, j.submitter_relation,
         -- Hanya bisa ditanya kalau namanya tampil (ada profil untuk dihubungi).
         j.open_to_questions and v.visible,
         case when v.visible then p.full_name end,
         case when v.visible then coalesce(p.username, p.id::text) end,
         case when v.visible then p.avatar_url end,
         j.created_at
  from public.jobs j
  left join public.profiles p on p.id = j.submitted_by
  cross join lateral (
    select j.submitted_by is not null and j.show_submitter
       and p.onboarded_at is not null and coalesce(p.full_name, '') <> '' as visible
  ) v
  where j.status = 'approved'
    and case
      when j.deadline is not null then j.deadline >= (now() at time zone 'Asia/Jakarta')::date
      else j.created_at >= now() - interval '45 days'
    end
  order by j.created_at desc;
$$;

revoke all on function public.published_jobs() from public;
grant execute on function public.published_jobs() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Kirim loker (atau edit kiriman sendiri).
-- Tim loker: langsung tayang. Member: antre review, hanya bisa edit selama pending.
-- ---------------------------------------------------------------------------

create or replace function public.submit_job(
  p_title text,
  p_company text,
  p_apply_url text,
  p_description text,
  p_employment_type text default 'full_time',
  p_work_mode text default 'onsite',
  p_location text default '',
  p_level text default null,
  p_salary text default '',
  p_deadline date default null,
  p_show_submitter boolean default true,
  p_submitter_relation text default 'share',
  p_open_to_questions boolean default false,
  p_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_poster boolean := public.is_job_poster();
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Masuk dulu untuk mengirim loker.' using errcode = '28000';
  end if;
  if not v_poster and not public.has_complete_profile() then
    raise exception 'Lengkapi profil dulu sebelum merekomendasikan loker.' using errcode = '42501';
  end if;
  if p_deadline is not null and p_deadline < (now() at time zone 'Asia/Jakarta')::date then
    raise exception 'Batas lamarannya sudah lewat.' using errcode = '22023';
  end if;

  if p_id is null then
    if not v_poster
      and (select count(*) from public.jobs where submitted_by = v_uid and status = 'pending') >= 10 then
      raise exception 'Kamu masih punya 10 loker yang menunggu review. Tunggu sebagian diproses dulu, ya.' using errcode = '54000';
    end if;

    insert into public.jobs (
      title, company, apply_url, description, employment_type, work_mode, location, level, salary, deadline,
      source, submitted_by, show_submitter, submitter_relation, open_to_questions, status, reviewed_by, reviewed_at
    ) values (
      trim(p_title), trim(p_company), trim(p_apply_url), trim(p_description), p_employment_type, p_work_mode,
      trim(coalesce(p_location, '')), p_level, trim(coalesce(p_salary, '')), p_deadline,
      case when v_poster then 'poster' else 'member' end, v_uid, coalesce(p_show_submitter, true),
      coalesce(p_submitter_relation, 'share'), coalesce(p_open_to_questions, false),
      case when v_poster then 'approved' else 'pending' end,
      case when v_poster then v_uid end, case when v_poster then now() end
    )
    returning id into v_id;
  else
    update public.jobs set
      title = trim(p_title), company = trim(p_company), apply_url = trim(p_apply_url), description = trim(p_description),
      employment_type = p_employment_type, work_mode = p_work_mode, location = trim(coalesce(p_location, '')),
      level = p_level, salary = trim(coalesce(p_salary, '')), deadline = p_deadline,
      show_submitter = coalesce(p_show_submitter, true),
      submitter_relation = coalesce(p_submitter_relation, 'share'),
      open_to_questions = coalesce(p_open_to_questions, false)
    where id = p_id and submitted_by = v_uid and (status = 'pending' or v_poster)
    returning id into v_id;

    if v_id is null then
      raise exception 'Loker ini sudah direview, jadi tidak bisa diedit lagi.' using errcode = '42501';
    end if;
  end if;

  return v_id;
end;
$$;

revoke all on function public.submit_job(text, text, text, text, text, text, text, text, text, date, boolean, text, boolean, uuid) from public;
grant execute on function public.submit_job(text, text, text, text, text, text, text, text, text, date, boolean, text, boolean, uuid) to authenticated;
-- Supabase memberi anon akses default ke fungsi baru; ini khusus akun yang login.
revoke execute on function public.submit_job(text, text, text, text, text, text, text, text, text, date, boolean, text, boolean, uuid) from anon;

-- ---------------------------------------------------------------------------
-- Nama pengirim untuk halaman kelola. Tim loker bukan admin, jadi tidak bisa
-- membaca tabel profiles; cukup nama & handle, tanpa email/WhatsApp.
-- ---------------------------------------------------------------------------

create or replace function public.job_submitters()
returns table (id uuid, full_name text, handle text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.full_name, coalesce(p.username, p.id::text)
  from public.profiles p
  where public.is_job_poster()
    and p.id in (select j.submitted_by from public.jobs j where j.submitted_by is not null);
$$;

revoke all on function public.job_submitters() from public;
grant execute on function public.job_submitters() to authenticated;
revoke execute on function public.job_submitters() from anon;
