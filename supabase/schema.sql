
-- ============================================================
-- Shared Hiking Album - Supabase schema
-- Run once in Supabase SQL Editor.
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.app_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.countries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  flag text not null default '🌍',
  sort_order integer not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  country_id uuid not null references public.countries(id) on delete cascade,
  name text not null,
  kind text,
  completed boolean not null default false,
  trip_date date,
  route_text text,
  memory_text text,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places(id) on delete cascade,
  storage_path text not null unique,
  original_name text,
  caption text,
  is_cover boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.app_members enable row level security;
alter table public.countries enable row level security;
alter table public.places enable row level security;
alter table public.photos enable row level security;

drop policy if exists "member can read own row" on public.app_members;
create policy "member can read own row"
on public.app_members for select to authenticated
using (user_id = auth.uid());

drop policy if exists "members read countries" on public.countries;
drop policy if exists "members insert countries" on public.countries;
drop policy if exists "members update countries" on public.countries;
drop policy if exists "members delete countries" on public.countries;

create policy "members read countries" on public.countries for select to authenticated
using (exists(select 1 from public.app_members m where m.user_id=auth.uid()));
create policy "members insert countries" on public.countries for insert to authenticated
with check (exists(select 1 from public.app_members m where m.user_id=auth.uid()));
create policy "members update countries" on public.countries for update to authenticated
using (exists(select 1 from public.app_members m where m.user_id=auth.uid()))
with check (exists(select 1 from public.app_members m where m.user_id=auth.uid()));
create policy "members delete countries" on public.countries for delete to authenticated
using (exists(select 1 from public.app_members m where m.user_id=auth.uid()));

drop policy if exists "members read places" on public.places;
drop policy if exists "members insert places" on public.places;
drop policy if exists "members update places" on public.places;
drop policy if exists "members delete places" on public.places;

create policy "members read places" on public.places for select to authenticated
using (exists(select 1 from public.app_members m where m.user_id=auth.uid()));
create policy "members insert places" on public.places for insert to authenticated
with check (exists(select 1 from public.app_members m where m.user_id=auth.uid()));
create policy "members update places" on public.places for update to authenticated
using (exists(select 1 from public.app_members m where m.user_id=auth.uid()))
with check (exists(select 1 from public.app_members m where m.user_id=auth.uid()));
create policy "members delete places" on public.places for delete to authenticated
using (exists(select 1 from public.app_members m where m.user_id=auth.uid()));

drop policy if exists "members read photos" on public.photos;
drop policy if exists "members insert photos" on public.photos;
drop policy if exists "members update photos" on public.photos;
drop policy if exists "members delete photos" on public.photos;

create policy "members read photos" on public.photos for select to authenticated
using (exists(select 1 from public.app_members m where m.user_id=auth.uid()));
create policy "members insert photos" on public.photos for insert to authenticated
with check (exists(select 1 from public.app_members m where m.user_id=auth.uid()));
create policy "members update photos" on public.photos for update to authenticated
using (exists(select 1 from public.app_members m where m.user_id=auth.uid()))
with check (exists(select 1 from public.app_members m where m.user_id=auth.uid()));
create policy "members delete photos" on public.photos for delete to authenticated
using (exists(select 1 from public.app_members m where m.user_id=auth.uid()));

insert into storage.buckets (id,name,public)
values ('trip-photos','trip-photos',false)
on conflict (id) do update set public=false;

drop policy if exists "members read trip photos" on storage.objects;
drop policy if exists "members upload trip photos" on storage.objects;
drop policy if exists "members update trip photos" on storage.objects;
drop policy if exists "members delete trip photos" on storage.objects;

create policy "members read trip photos" on storage.objects for select to authenticated
using (
  bucket_id='trip-photos' and
  exists(select 1 from public.app_members m where m.user_id=auth.uid())
);
create policy "members upload trip photos" on storage.objects for insert to authenticated
with check (
  bucket_id='trip-photos' and
  exists(select 1 from public.app_members m where m.user_id=auth.uid())
);
create policy "members update trip photos" on storage.objects for update to authenticated
using (
  bucket_id='trip-photos' and
  exists(select 1 from public.app_members m where m.user_id=auth.uid())
)
with check (
  bucket_id='trip-photos' and
  exists(select 1 from public.app_members m where m.user_id=auth.uid())
);
create policy "members delete trip photos" on storage.objects for delete to authenticated
using (
  bucket_id='trip-photos' and
  exists(select 1 from public.app_members m where m.user_id=auth.uid())
);

-- Enable live updates for the shared album.
do $$
begin
  alter publication supabase_realtime add table public.countries;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.places;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.photos;
exception when duplicate_object then null;
end $$;

-- After creating the two Auth users in Dashboard -> Authentication -> Users,
-- add ONLY those two UUIDs:
--
-- insert into public.app_members(user_id,display_name) values
-- ('FIRST-USER-UUID','名字1'),
-- ('SECOND-USER-UUID','名字2');
--
-- Then disable public sign-up in Supabase Auth settings.
