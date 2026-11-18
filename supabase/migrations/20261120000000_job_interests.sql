-- Loker jadi portal internal + tombol "Tertarik".
--
--   - Direktori hanya untuk yang login (published_jobs tidak lagi untuk anon).
--   - Pemilik loker (owner_id): member yang membagikannya di grup. Default pengirim;
--     tim loker yang menginput atas nama orang lain bisa menunjuk member pemiliknya.
--   - Member dengan profil lengkap bisa menandai "Tertarik". Pemilik loker & tim loker
--     melihat siapa saja, lengkap dengan profil, WhatsApp, dan LinkedIn mereka.
-- Aman dijalankan ulang.

alter table public.jobs add column if not exists owner_id uuid references public.profiles (id) on delete set null;
create index if not exists jobs_owner_id_idx on public.jobs (owner_id);

-- Loker yang sudah ada: pemiliknya pengirim kalau dia member (bukan tim loker yang menginput).
update public.jobs set owner_id = submitted_by where owner_id is null and source = 'member';

drop policy if exists "Members read own jobs" on public.jobs;
create policy "Members read own jobs" on public.jobs
  for select to authenticated
  using (submitted_by = (select auth.uid()) or owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Tertarik
-- ---------------------------------------------------------------------------

create table if not exists public.job_interests (
  job_id uuid not null references public.jobs (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (job_id, user_id)
);

create index if not exists job_interests_user_idx on public.job_interests (user_id);

alter table public.job_interests enable row level security;

-- Baca/tulis lewat fungsi di bawah; langsung dari tabel hanya baris sendiri.
drop policy if exists "Members read own interests" on public.job_interests;
create policy "Members read own interests" on public.job_interests
  for select to authenticated
  using (user_id = (select auth.uid()));

grant select on public.job_interests to authenticated;

create or replace function public.toggle_job_interest(p_job_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Masuk dulu untuk menandai tertarik.' using errcode = '28000';
  end if;
  if exists (select 1 from public.job_interests where job_id = p_job_id and user_id = v_uid) then
    delete from public.job_interests where job_id = p_job_id and user_id = v_uid;
    return false;
  end if;
  if not public.has_complete_profile() then
    raise exception 'Lengkapi profil dulu, supaya pemilik loker bisa mengenal dan menghubungimu.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.jobs where id = p_job_id and status = 'approved') then
    raise exception 'Loker ini sudah tidak tayang.' using errcode = '22023';
  end if;
  insert into public.job_interests (job_id, user_id) values (p_job_id, v_uid);
  return true;
end;
$$;

revoke all on function public.toggle_job_interest(uuid) from public;
grant execute on function public.toggle_job_interest(uuid) to authenticated;
revoke execute on function public.toggle_job_interest(uuid) from anon;

-- Siapa saja yang tertarik: hanya untuk pemilik, pengirim, dan tim loker.
create or replace function public.job_interested(p_job_id uuid)
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
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.full_name, coalesce(p.username, p.id::text), p.avatar_url, p.headline, p.seniority, p.company,
         p.tech_stack, p.whatsapp, p.linkedin_url, i.created_at
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

-- Jumlah peminat per loker untuk Lokerku & halaman kelola (hanya loker yang boleh dilihat pemanggil).
create or replace function public.job_interest_counts()
returns table (job_id uuid, total integer)
language sql
stable
security definer
set search_path = ''
as $$
  select i.job_id, count(*)::integer
  from public.job_interests i
  join public.jobs j on j.id = i.job_id
  where j.owner_id = auth.uid() or j.submitted_by = auth.uid() or public.is_job_poster()
  group by i.job_id;
$$;

revoke all on function public.job_interest_counts() from public;
grant execute on function public.job_interest_counts() to authenticated;
revoke execute on function public.job_interest_counts() from anon;

-- Pilihan pemilik loker di form tim loker (tim loker bukan admin, tidak bisa membaca profiles).
create or replace function public.job_owner_candidates()
returns table (id uuid, full_name text, handle text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.full_name, coalesce(p.username, p.id::text)
  from public.profiles p
  where public.is_job_poster() and p.onboarded_at is not null and p.full_name <> ''
  order by p.full_name;
$$;

revoke all on function public.job_owner_candidates() from public;
grant execute on function public.job_owner_candidates() to authenticated;
revoke execute on function public.job_owner_candidates() from anon;

-- ---------------------------------------------------------------------------
-- Direktori internal: + jumlah peminat, status tertarik pemanggil, dan apakah ia pemiliknya.
-- ---------------------------------------------------------------------------

drop function if exists public.published_jobs();

create function public.published_jobs()
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
  contact_name text,
  contact text,
  original_message text,
  owner_name text,
  owner_handle text,
  owner_avatar_url text,
  is_mine boolean,
  interest_count integer,
  interested boolean,
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
         j.contact_name, j.contact, j.original_message,
         case when v.visible then p.full_name end,
         case when v.visible then coalesce(p.username, p.id::text) end,
         case when v.visible then p.avatar_url end,
         coalesce(j.owner_id, j.submitted_by) = auth.uid(),
         (select count(*)::integer from public.job_interests i where i.job_id = j.id),
         exists (select 1 from public.job_interests i where i.job_id = j.id and i.user_id = auth.uid()),
         j.created_at
  from public.jobs j
  -- Yang tampil di kartu: pemilik loker, atau pengirim kalau pemiliknya tidak ditunjuk.
  left join public.profiles p on p.id = coalesce(j.owner_id, j.submitted_by)
  cross join lateral (
    select p.id is not null and j.show_submitter
       and p.onboarded_at is not null and coalesce(p.full_name, '') <> '' as visible
  ) v
  where auth.uid() is not null
    and j.status = 'approved'
    and case
      when j.deadline is not null then j.deadline >= (now() at time zone 'Asia/Jakarta')::date
      else j.created_at >= now() - interval '45 days'
    end
  order by j.created_at desc;
$$;

revoke all on function public.published_jobs() from public;
grant execute on function public.published_jobs() to authenticated;
revoke execute on function public.published_jobs() from anon;

-- ---------------------------------------------------------------------------
-- submit_job + pemilik loker. Member: pemiliknya selalu dirinya sendiri.
-- Tim loker: boleh menunjuk member lain (atau kosong = dirinya).
-- ---------------------------------------------------------------------------

drop function if exists public.submit_job(text, text, text, text, text, text, text, text, text, date, boolean, text, boolean, text, text, text, uuid);

create or replace function public.submit_job(
  p_title text,
  p_company text default '',
  p_apply_url text default null,
  p_description text default '',
  p_employment_type text default 'full_time',
  p_work_mode text default 'onsite',
  p_location text default '',
  p_level text default null,
  p_salary text default '',
  p_deadline date default null,
  p_show_submitter boolean default true,
  p_submitter_relation text default 'share',
  p_open_to_questions boolean default false,
  p_contact_name text default '',
  p_contact text default '',
  p_original_message text default '',
  p_owner_id uuid default null,
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
  v_owner uuid := case when public.is_job_poster() then coalesce(p_owner_id, auth.uid()) else auth.uid() end;
  v_apply text := nullif(trim(coalesce(p_apply_url, '')), '');
  v_contact text := trim(coalesce(p_contact, ''));
  v_description text := trim(coalesce(p_description, ''));
  v_message text := trim(coalesce(p_original_message, ''));
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
  if v_apply is null and v_contact = '' then
    raise exception 'Isi link lamaran atau kontak CP, supaya pelamar tahu harus ke mana.' using errcode = '22023';
  end if;
  if v_description = '' and v_message = '' then
    raise exception 'Isi ringkasan atau tempel pesan aslinya.' using errcode = '22023';
  end if;

  if p_id is null then
    if not v_poster
      and (select count(*) from public.jobs where submitted_by = v_uid and status = 'pending') >= 10 then
      raise exception 'Kamu masih punya 10 loker yang menunggu review. Tunggu sebagian diproses dulu, ya.' using errcode = '54000';
    end if;

    insert into public.jobs (
      title, company, apply_url, description, employment_type, work_mode, location, level, salary, deadline,
      contact_name, contact, original_message, owner_id,
      source, submitted_by, show_submitter, submitter_relation, open_to_questions, status, reviewed_by, reviewed_at
    ) values (
      trim(p_title), trim(coalesce(p_company, '')), v_apply, v_description, p_employment_type, p_work_mode,
      trim(coalesce(p_location, '')), p_level, trim(coalesce(p_salary, '')), p_deadline,
      trim(coalesce(p_contact_name, '')), v_contact, v_message, v_owner,
      case when v_poster then 'poster' else 'member' end, v_uid, coalesce(p_show_submitter, true),
      coalesce(p_submitter_relation, 'share'), coalesce(p_open_to_questions, false),
      case when v_poster then 'approved' else 'pending' end,
      case when v_poster then v_uid end, case when v_poster then now() end
    )
    returning id into v_id;
  else
    update public.jobs set
      title = trim(p_title), company = trim(coalesce(p_company, '')), apply_url = v_apply, description = v_description,
      employment_type = p_employment_type, work_mode = p_work_mode, location = trim(coalesce(p_location, '')),
      level = p_level, salary = trim(coalesce(p_salary, '')), deadline = p_deadline,
      contact_name = trim(coalesce(p_contact_name, '')), contact = v_contact, original_message = v_message,
      owner_id = case when v_poster then v_owner else owner_id end,
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

revoke all on function public.submit_job(text, text, text, text, text, text, text, text, text, date, boolean, text, boolean, text, text, text, uuid, uuid) from public;
grant execute on function public.submit_job(text, text, text, text, text, text, text, text, text, date, boolean, text, boolean, text, text, text, uuid, uuid) to authenticated;
revoke execute on function public.submit_job(text, text, text, text, text, text, text, text, text, date, boolean, text, boolean, text, text, text, uuid, uuid) from anon;

-- Nama untuk halaman kelola: pengirim dan pemilik loker.
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
    and p.id in (
      select j.submitted_by from public.jobs j where j.submitted_by is not null
      union
      select j.owner_id from public.jobs j where j.owner_id is not null
    );
$$;
