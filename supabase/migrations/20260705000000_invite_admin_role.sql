-- ============================================================================
-- Invite-aware profile creation
-- ============================================================================
-- Updates the new-user trigger so profiles.role honours the role assigned at
-- invite time. When an owner invites an admin we call
--   auth.admin.inviteUserByEmail(email, { data: { role } })
-- which stores { role } in auth.users.raw_user_meta_data. That INSERT into
-- auth.users fires this trigger, so the profile row is created immediately with
-- the assigned role — and it is still correct when the invitee later accepts and
-- sets their password (acceptance does not create a new auth.users row).
--
-- The role is NEVER hardcoded to a privileged value: it is read from metadata
-- and defaults to the least-privileged 'customer' for ordinary sign-ups (which
-- pass no role).
--
-- Apply with the Supabase SQL editor or `supabase db push`. This is a
-- CREATE OR REPLACE, so it updates the existing function in place. If your
-- existing function or trigger uses different names, keep those names and port
-- only the role logic below.
-- ============================================================================

-- The role column is guarded by a CHECK constraint. Widen it so the new
-- 'owner' role is permitted alongside the existing 'customer' and 'admin'.
-- (Adjust the value list here if your app defines additional roles.)
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('customer', 'admin', 'owner'));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    -- Read the invited role from metadata; blank/absent → 'customer'.
    coalesce(nullif(new.raw_user_meta_data ->> 'role', ''), 'customer')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Ensure the trigger is attached (idempotent).
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
