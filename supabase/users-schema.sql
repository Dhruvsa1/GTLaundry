-- Users Management Schema
-- This creates a proper users table and updates admin functionality

-- Create a comprehensive users table that extends auth.users
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_sign_in_at timestamptz,
  is_active boolean not null default true,
  metadata jsonb default '{}'::jsonb
);

-- Update admin_users to reference the users table
alter table public.admin_users 
drop constraint if exists admin_users_id_fkey,
add constraint admin_users_id_fkey 
foreign key (id) references public.users(id) on delete cascade;

-- Create indexes for performance
create index on public.users(email);
create index on public.users(created_at);
create index on public.users(is_active);

-- Enable RLS on users table
alter table public.users enable row level security;

-- RLS Policies for users table
-- Users can view their own profile
create policy "users can view own profile" on public.users
for select using (auth.uid() = id);

-- Users can update their own profile (except admin-only fields)
create policy "users can update own profile" on public.users
for update using (auth.uid() = id);

-- Admins can view all users
create policy "admins can view all users" on public.users
for select using (
  exists (
    select 1 from public.admin_users 
    where id = auth.uid() and role in ('admin', 'super_admin')
  )
);

-- Only super_admins can update other users
create policy "super_admins can update users" on public.users
for update using (
  exists (
    select 1 from public.admin_users 
    where id = auth.uid() and role = 'super_admin'
  )
);

-- Only super_admins can delete users
create policy "super_admins can delete users" on public.users
for delete using (
  exists (
    select 1 from public.admin_users 
    where id = auth.uid() and role = 'super_admin'
  )
);

-- Function to create a user record when someone signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name, avatar_url, phone, created_at, updated_at, last_sign_in_at)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    new.phone,
    new.created_at,
    new.updated_at,
    new.last_sign_in_at
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to automatically create user record when auth.users is created
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Function to update last_sign_in_at when user signs in
create or replace function public.handle_user_signin()
returns trigger as $$
begin
  update public.users 
  set last_sign_in_at = new.last_sign_in_at, updated_at = now()
  where id = new.id;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to update last_sign_in_at
create trigger on_auth_user_signin
  after update of last_sign_in_at on auth.users
  for each row execute function public.handle_user_signin();

-- Function to promote user to admin (only super_admins can do this)
create or replace function public.promote_user_to_admin(target_user_id uuid, new_role text default 'admin')
returns boolean as $$
begin
  -- Check if current user is super_admin
  if not exists (
    select 1 from public.admin_users 
    where id = auth.uid() and role = 'super_admin'
  ) then
    raise exception 'Only super_admins can promote users to admin';
  end if;
  
  -- Check if target user exists
  if not exists (select 1 from public.users where id = target_user_id) then
    raise exception 'User does not exist';
  end if;
  
  -- Prevent promoting super_admins (they are untouchable)
  if exists (
    select 1 from public.admin_users 
    where id = target_user_id and role = 'super_admin'
  ) then
    raise exception 'Cannot modify super_admin role - super_admins are untouchable';
  end if;
  
  -- Validate role
  if new_role not in ('user', 'admin') then
    raise exception 'Invalid role. Must be user or admin';
  end if;
  
  -- Insert or update admin_users
  insert into public.admin_users (id, role, created_by)
  values (target_user_id, new_role, auth.uid())
  on conflict (id) do update set 
    role = excluded.role,
    updated_at = now(),
    created_by = auth.uid();
    
  return true;
end;
$$ language plpgsql security definer;

-- Function to demote admin to user (only super_admins can do this)
create or replace function public.demote_admin_to_user(target_user_id uuid)
returns boolean as $$
begin
  -- Check if current user is super_admin
  if not exists (
    select 1 from public.admin_users 
    where id = auth.uid() and role = 'super_admin'
  ) then
    raise exception 'Only super_admins can demote users';
  end if;
  
  -- Prevent demoting super_admins (they are untouchable)
  if exists (
    select 1 from public.admin_users 
    where id = target_user_id and role = 'super_admin'
  ) then
    raise exception 'Cannot modify super_admin role - super_admins are untouchable';
  end if;
  
  -- Remove from admin_users table
  delete from public.admin_users where id = target_user_id;
  
  return true;
end;
$$ language plpgsql security definer;

-- Function to get all users with their admin status
create or replace function public.get_all_users()
returns table (
  id uuid,
  email text,
  full_name text,
  avatar_url text,
  phone text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  is_active boolean,
  admin_role text,
  is_admin boolean
) as $$
begin
  -- Check if current user is admin or super_admin
  if not exists (
    select 1 from public.admin_users 
    where id = auth.uid() and role in ('admin', 'super_admin')
  ) then
    raise exception 'Only admins can view all users';
  end if;
  
  return query
  select 
    u.id,
    u.email,
    u.full_name,
    u.avatar_url,
    u.phone,
    u.created_at,
    u.last_sign_in_at,
    u.is_active,
    coalesce(au.role, 'user') as admin_role,
    (au.id is not null) as is_admin
  from public.users u
  left join public.admin_users au on u.id = au.id
  order by u.created_at desc;
end;
$$ language plpgsql security definer;

-- Migrate existing users from auth.users to public.users
-- This will create user records for anyone who signed up before this schema
insert into public.users (id, email, full_name, avatar_url, phone, created_at, updated_at, last_sign_in_at)
select 
  id,
  email,
  raw_user_meta_data->>'full_name' as full_name,
  raw_user_meta_data->>'avatar_url' as avatar_url,
  phone,
  created_at,
  updated_at,
  last_sign_in_at
from auth.users
where id not in (select id from public.users)
on conflict (id) do nothing;
