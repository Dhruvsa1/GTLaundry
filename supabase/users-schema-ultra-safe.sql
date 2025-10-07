-- Ultra Safe Users Schema - No destructive operations
-- This version only creates new things, never drops anything

-- Create users table if it doesn't exist
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

-- Create indexes if they don't exist
create index if not exists idx_users_email on public.users(email);
create index if not exists idx_users_created_at on public.users(created_at);
create index if not exists idx_users_is_active on public.users(is_active);

-- Enable RLS on users table (safe to run multiple times)
alter table public.users enable row level security;

-- Create RLS Policies for users table (only if they don't exist)
do $$
begin
  -- Only create policies if they don't exist
  if not exists (select 1 from pg_policies where tablename = 'users' and policyname = 'users can view own profile') then
    create policy "users can view own profile" on public.users
    for select using (auth.uid() = id);
  end if;
  
  if not exists (select 1 from pg_policies where tablename = 'users' and policyname = 'users can update own profile') then
    create policy "users can update own profile" on public.users
    for update using (auth.uid() = id);
  end if;
  
  if not exists (select 1 from pg_policies where tablename = 'users' and policyname = 'admins can view all users') then
    create policy "admins can view all users" on public.users
    for select using (
      exists (
        select 1 from public.admin_users 
        where id = auth.uid() and role in ('admin', 'super_admin')
      )
    );
  end if;
  
  if not exists (select 1 from pg_policies where tablename = 'users' and policyname = 'super_admins can update users') then
    create policy "super_admins can update users" on public.users
    for update using (
      exists (
        select 1 from public.admin_users 
        where id = auth.uid() and role = 'super_admin'
      )
    );
  end if;
  
  if not exists (select 1 from pg_policies where tablename = 'users' and policyname = 'super_admins can delete users') then
    create policy "super_admins can delete users" on public.users
    for delete using (
      exists (
        select 1 from public.admin_users 
        where id = auth.uid() and role = 'super_admin'
      )
    );
  end if;
end $$;

-- Create or replace functions (safe to run multiple times)
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

create or replace function public.handle_user_signin()
returns trigger as $$
begin
  update public.users 
  set last_sign_in_at = new.last_sign_in_at, updated_at = now()
  where id = new.id;
  return new;
end;
$$ language plpgsql security definer;

-- Create triggers only if they don't exist
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'on_auth_user_created') then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute function public.handle_new_user();
  end if;
  
  if not exists (select 1 from pg_trigger where tgname = 'on_auth_user_signin') then
    create trigger on_auth_user_signin
      after update of last_sign_in_at on auth.users
      for each row execute function public.handle_user_signin();
  end if;
end $$;

-- Create or replace admin management functions
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
  if new_role not in ('user', 'admin', 'super_admin') then
    raise exception 'Invalid role. Must be user, admin, or super_admin';
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

-- Migrate existing users from auth.users to public.users (safe to run multiple times)
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
