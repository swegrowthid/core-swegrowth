-- Loker dari grup sering diinput admin (bukan pemilik loker), kadang tanpa nama
-- perusahaan dan hanya "kirim CV ke saya". Jadi:
--   - contact person (CP) terpisah dari pengirim: nama + kontak (WA/email/LinkedIn)
--   - perusahaan boleh kosong
--   - cara melamar cukup salah satu: link lamaran atau kontak CP
--   - pesan asli dari grup disimpan dan bisa dibaca di kartu
-- Kontak CP hanya dikirim ke yang login, supaya nomor HP tidak terbuka untuk scraper.
-- Aman dijalankan ulang.

alter table public.jobs
  add column if not exists contact_name text not null default '' check (char_length(contact_name) <= 80),
  add column if not exists contact text not null default '' check (char_length(contact) <= 200),
  add column if not exists original_message text not null default '' check (char_length(original_message) <= 4000);

alter table public.jobs alter column company set default '';
alter table public.jobs drop constraint if exists jobs_company_check;
alter table public.jobs add constraint jobs_company_check check (char_length(company) <= 120);

alter table public.jobs alter column apply_url drop not null;
alter table public.jobs drop constraint if exists jobs_apply_url_check;
alter table public.jobs add constraint jobs_apply_url_check check (apply_url ~ '^(https://|mailto:)');

alter table public.jobs drop constraint if exists jobs_description_check;
alter table public.jobs add constraint jobs_description_check check (char_length(description) <= 1000);

alter table public.jobs drop constraint if exists jobs_how_to_apply_check;
alter table public.jobs add constraint jobs_how_to_apply_check check (apply_url is not null or contact <> '');

alter table public.jobs drop constraint if exists jobs_content_check;
alter table public.jobs add constraint jobs_content_check check (description <> '' or original_message <> '');

-- ---------------------------------------------------------------------------
-- Direktori publik: kolom kontak CP & pesan asli. Bentuk hasil berubah, jadi drop dulu.
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
  -- null untuk pengunjung yang belum login; has_contact memberi tahu kontaknya ada.
  contact text,
  has_contact boolean,
  original_message text,
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
         j.contact_name,
         case when auth.uid() is not null then nullif(j.contact, '') end,
         j.contact <> '',
         j.original_message,
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
-- submit_job dengan CP, pesan asli, dan link lamaran opsional. Signature berubah,
-- jadi versi lama dibuang supaya tidak ada dua overload.
-- ---------------------------------------------------------------------------

drop function if exists public.submit_job(text, text, text, text, text, text, text, text, text, date, boolean, text, boolean, uuid);

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
      contact_name, contact, original_message,
      source, submitted_by, show_submitter, submitter_relation, open_to_questions, status, reviewed_by, reviewed_at
    ) values (
      trim(p_title), trim(coalesce(p_company, '')), v_apply, v_description, p_employment_type, p_work_mode,
      trim(coalesce(p_location, '')), p_level, trim(coalesce(p_salary, '')), p_deadline,
      trim(coalesce(p_contact_name, '')), v_contact, v_message,
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

revoke all on function public.submit_job(text, text, text, text, text, text, text, text, text, date, boolean, text, boolean, text, text, text, uuid) from public;
grant execute on function public.submit_job(text, text, text, text, text, text, text, text, text, date, boolean, text, boolean, text, text, text, uuid) to authenticated;
revoke execute on function public.submit_job(text, text, text, text, text, text, text, text, text, date, boolean, text, boolean, text, text, text, uuid) from anon;
