-- ENUMS
create type machine_type as enum ('washer','dryer');
create type machine_status as enum ('available','running','finished','offline');
create type reservation_status as enum ('active','used','expired','canceled');

-- TABLES
create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  timezone text
);

create table if not exists public.machines (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations(id) on delete cascade,
  label text not null,
  type machine_type not null,
  status machine_status not null default 'available',
  cycle_started_at timestamptz,
  cycle_ends_at timestamptz,
  last_heartbeat_at timestamptz,
  metadata jsonb default '{}'::jsonb
);
create index on public.machines(location_id);
create index on public.machines(status);

create table if not exists public.cycles (
  id uuid primary key default gen_random_uuid(),
  machine_id uuid not null references public.machines(id) on delete cascade,
  user_id uuid,
  started_at timestamptz not null default now(),
  expected_end_at timestamptz,
  ended_at timestamptz,
  status text not null default 'running'
);
create index on public.cycles(machine_id, started_at desc);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  platform text not null default 'web',
  created_at timestamptz not null default now()
);
create index on public.subscriptions(user_id);

-- Enable realtime
alter publication supabase_realtime add table public.machines;

-- RLS
alter table public.locations enable row level security;
alter table public.machines enable row level security;
alter table public.cycles enable row level security;
alter table public.subscriptions enable row level security;

-- Policies: public read for locations & machines (you can tighten later to campus domain)
create policy "read locations" on public.locations
for select using (true);

create policy "read machines" on public.machines
for select using (true);

-- Users can insert their own subscriptions (no auth binding here for MVP)
create policy "insert subs" on public.subscriptions
for insert with check (true);

-- Users can select only their own subscriptions if user_id is set, else allow (MVP)
create policy "read subs" on public.subscriptions
for select using (true);

-- Optional: only admin/service role can write machines
create policy "no public writes machines" on public.machines
for all to public using (false) with check (false);

-- Seed example data
insert into public.locations (name, address, timezone) values
('Main Hall Basement', '123 Campus Way', 'America/New_York'),
('North Dorm 1st Floor', '200 North Quad', 'America/New_York');

insert into public.machines (location_id, label, type)
select id, 'W-1', 'washer' from public.locations where name='Main Hall Basement';
insert into public.machines (location_id, label, type)
select id, 'D-1', 'dryer' from public.locations where name='Main Hall Basement';
insert into public.machines (location_id, label, type)
select id, 'W-2', 'washer' from public.locations where name='Main Hall Basement';
insert into public.machines (location_id, label, type)
select id, 'D-2', 'dryer' from public.locations where name='Main Hall Basement';

insert into public.machines (location_id, label, type)
select id, 'W-1', 'washer' from public.locations where name='North Dorm 1st Floor';
insert into public.machines (location_id, label, type)
select id, 'D-1', 'dryer' from public.locations where name='North Dorm 1st Floor';
