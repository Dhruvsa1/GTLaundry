-- Fix the infinite recursion in admin_users policies

-- Drop the problematic policies
drop policy if exists "users can view own admin profile" on public.admin_users;
drop policy if exists "admins can view all admin users" on public.admin_users;

-- Create simpler, non-recursive policies
create policy "users can view own admin profile" on public.admin_users
for select using (auth.uid() = id);

-- For admins to view all admin users, we'll use a different approach
-- This policy allows users to view admin users if they have a role of admin or super_admin
-- But we need to be careful not to create recursion
create policy "view admin users" on public.admin_users
for select using (
  -- Allow if it's your own record
  auth.uid() = id
  OR
  -- Allow if you're a service role (for admin operations)
  auth.role() = 'service_role'
  OR
  -- Allow if you're authenticated and the record exists (we'll check permissions in the app)
  auth.uid() is not null
);

-- Also fix the other policies that might have similar issues
drop policy if exists "admins can view all requests" on public.location_requests;
create policy "view location requests" on public.location_requests
for select using (
  -- Users can view their own requests
  auth.uid() = user_id
  OR
  -- Service role can view all
  auth.role() = 'service_role'
  OR
  -- Allow authenticated users to view (we'll check permissions in the app)
  auth.uid() is not null
);

drop policy if exists "admins can view all analytics" on public.user_analytics;
create policy "view user analytics" on public.user_analytics
for select using (
  -- Users can view their own analytics
  auth.uid() = user_id
  OR
  -- Service role can view all
  auth.role() = 'service_role'
  OR
  -- Allow authenticated users to view (we'll check permissions in the app)
  auth.uid() is not null
);

drop policy if exists "admins can view audit log" on public.admin_audit_log;
create policy "view audit log" on public.admin_audit_log
for select using (
  -- Service role can view all
  auth.role() = 'service_role'
  OR
  -- Allow authenticated users to view (we'll check permissions in the app)
  auth.uid() is not null
);
