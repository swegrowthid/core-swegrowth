-- Event komunitas: subgrup penyelenggara (English Club, Fundamental, …),
-- jadwal berulang, dan foto dokumentasi. Aman dijalankan ulang.

-- ---------------------------------------------------------------------------
-- Subgrup komunitas (penyelenggara event)
-- ---------------------------------------------------------------------------

create table if not exists public.community_groups (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 80),
  description text not null default '' check (char_length(description) <= 300),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.community_groups enable row level security;

drop policy if exists "Community groups are readable" on public.community_groups;
create policy "Community groups are readable" on public.community_groups
  for select to anon, authenticated
  using (true);

drop policy if exists "Admins manage community groups" on public.community_groups;
create policy "Admins manage community groups" on public.community_groups
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

grant select on public.community_groups to anon;
grant select, insert, update, delete on public.community_groups to authenticated;

-- ---------------------------------------------------------------------------
-- Kolom event
-- ---------------------------------------------------------------------------

-- organizer_group_id: subgrup penyelenggara (kosong = SWE Growth langsung).
-- recurrence: starts_at/ends_at adalah sesi pertama; sesi berikutnya dihitung
-- dari pola ini sampai recurrence_until (tanggal WIB, inklusif; kosong = terus).
-- photos: dokumentasi [{ url, caption }].
alter table public.activities
  add column if not exists organizer_group_id uuid references public.community_groups (id) on delete set null,
  add column if not exists recurrence text check (recurrence in ('weekly', 'biweekly', 'monthly')),
  add column if not exists recurrence_until date,
  add column if not exists photos jsonb not null default '[]'
    check (jsonb_typeof(photos) = 'array' and jsonb_array_length(photos) <= 40);

create index if not exists activities_organizer_group_idx on public.activities (organizer_group_id);

-- ---------------------------------------------------------------------------
-- Storage: foto dokumentasi (publik dibaca, hanya admin yang mengunggah)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-photos', 'event-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admins upload event photos" on storage.objects;
create policy "Admins upload event photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'event-photos' and (select public.is_admin()));

drop policy if exists "Admins update event photos" on storage.objects;
create policy "Admins update event photos" on storage.objects
  for update to authenticated
  using (bucket_id = 'event-photos' and (select public.is_admin()));

drop policy if exists "Admins delete event photos" on storage.objects;
create policy "Admins delete event photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'event-photos' and (select public.is_admin()));
