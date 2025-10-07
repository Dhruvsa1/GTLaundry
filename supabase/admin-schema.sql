-- Admin and Location Request Schema Updates

-- ENUMS for admin functionality
create type request_status as enum ('pending', 'approved', 'rejected');
create type user_role as enum ('user', 'admin', 'super_admin');

-- Admin users table (extends Supabase auth.users)
create table if not exists public.admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  metadata jsonb default '{}'::jsonb
);

-- Location requests table
create table if not exists public.location_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  address text not null,
  description text,
  building text,
  floor text,
  estimated_machines jsonb default '[]'::jsonb, -- [{"type": "washer", "count": 4}, {"type": "dryer", "count": 4}]
  contact_email text,
  contact_phone text,
  status request_status not null default 'pending',
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- User analytics table
create table if not exists public.user_analytics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null, -- 'login', 'cycle_started', 'cycle_ended', 'notification_sent'
  event_data jsonb default '{}'::jsonb,
  location_id uuid references public.locations(id),
  machine_id uuid references public.machines(id),
  created_at timestamptz not null default now()
);

-- Admin audit log
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id) on delete cascade,
  action text not null, -- 'create_location', 'delete_machine', 'approve_request', etc.
  target_type text, -- 'location', 'machine', 'user', 'request'
  target_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

-- Update locations table with admin fields
alter table public.locations add column if not exists created_by uuid references auth.users(id);
alter table public.locations add column if not exists is_active boolean not null default true;
alter table public.locations add column if not exists description text;
alter table public.locations add column if not exists building text;
alter table public.locations add column if not exists floor text;

-- Update machines table with admin fields
alter table public.machines add column if not exists created_by uuid references auth.users(id);
alter table public.machines add column if not exists is_active boolean not null default true;
alter table public.machines add column if not exists model text;
alter table public.machines add column if not exists capacity text;

-- Indexes
create index on public.admin_users(role);
create index on public.location_requests(status);
create index on public.location_requests(user_id);
create index on public.user_analytics(user_id, event_type);
create index on public.user_analytics(created_at);
create index on public.admin_audit_log(admin_id);
create index on public.admin_audit_log(created_at);

-- RLS Policies
alter table public.admin_users enable row level security;
alter table public.location_requests enable row level security;
alter table public.user_analytics enable row level security;
alter table public.admin_audit_log enable row level security;

-- Admin users policies
create policy "users can view own admin profile" on public.admin_users
for select using (auth.uid() = id);

create policy "admins can view all admin users" on public.admin_users
for select using (
  exists (
    select 1 from public.admin_users 
    where id = auth.uid() and role in ('admin', 'super_admin')
  )
);

-- Location requests policies
create policy "users can create location requests" on public.location_requests
for insert with check (auth.uid() = user_id);

create policy "users can view own requests" on public.location_requests
for select using (auth.uid() = user_id);

create policy "admins can view all requests" on public.location_requests
for select using (
  exists (
    select 1 from public.admin_users 
    where id = auth.uid() and role in ('admin', 'super_admin')
  )
);

create policy "admins can update requests" on public.location_requests
for update using (
  exists (
    select 1 from public.admin_users 
    where id = auth.uid() and role in ('admin', 'super_admin')
  )
);

-- User analytics policies
create policy "users can view own analytics" on public.user_analytics
for select using (auth.uid() = user_id);

create policy "admins can view all analytics" on public.user_analytics
for select using (
  exists (
    select 1 from public.admin_users 
    where id = auth.uid() and role in ('admin', 'super_admin')
  )
);

create policy "system can insert analytics" on public.user_analytics
for insert with check (true);

-- Admin audit log policies
create policy "admins can view audit log" on public.admin_audit_log
for select using (
  exists (
    select 1 from public.admin_users 
    where id = auth.uid() and role in ('admin', 'super_admin')
  )
);

-- Functions for admin operations
create or replace function public.is_admin(user_id uuid default auth.uid())
returns boolean as $$
begin
  return exists (
    select 1 from public.admin_users 
    where id = user_id and role in ('admin', 'super_admin')
  );
end;
$$ language plpgsql security definer;

create or replace function public.is_super_admin(user_id uuid default auth.uid())
returns boolean as $$
begin
  return exists (
    select 1 from public.admin_users 
    where id = user_id and role = 'super_admin'
  );
end;
$$ language plpgsql security definer;

-- Trigger to update updated_at timestamps
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_admin_users_updated_at
  before update on public.admin_users
  for each row execute function public.update_updated_at_column();

create trigger update_location_requests_updated_at
  before update on public.location_requests
  for each row execute function public.update_updated_at_column();

-- Seed initial admin user (replace with your actual user ID)
-- You'll need to insert your user ID here after creating an account
-- insert into public.admin_users (id, role) values ('your-user-id-here', 'super_admin');
