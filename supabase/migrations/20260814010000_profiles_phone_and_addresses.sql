-- ============================================================================
-- profiles.phone / profiles.updated_at + addresses table
-- ============================================================================
-- Adds a phone number to profiles, backfills the missing updated_at column
-- that every other table in this schema already has, and creates a dedicated
-- addresses table (one-to-many per user, with a single default) rather than
-- flattening a single address onto profiles — see the plan reviewed before
-- this migration was written for the reasoning.
--
-- Applied by hand (or via `supabase db query --linked`) against production.
-- Wrapped in BEGIN … COMMIT for atomic rollback on any error. Additive and
-- idempotent (IF NOT EXISTS / DROP POLICY IF EXISTS throughout).
-- ============================================================================

begin;

-- ── 1. profiles: phone + updated_at ─────────────────────────────────────────
alter table public.profiles
  add column if not exists phone text,
  add column if not exists updated_at timestamptz not null default now();

comment on column public.profiles.phone is
  'Customer phone number, self-managed via the account page. Nullable — optional.';

-- ── 2. addresses ─────────────────────────────────────────────────────────────
create table if not exists public.addresses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  label        text not null default '',   -- customer-facing, e.g. "Home", "Office"
  street       text not null,
  city         text not null,
  province     text,
  postal_code  text,
  country      text not null default 'Pakistan',
  is_default   boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists addresses_user_id_idx on public.addresses (user_id);

-- Enforces "at most one default per user" at the DB level, not just app logic.
create unique index if not exists addresses_one_default_per_user_idx
  on public.addresses (user_id) where is_default;

alter table public.addresses enable row level security;

-- Owner-only read/write, mirroring the existing profiles RLS pattern exactly.
-- Reuses the existing is_admin() function (already used by profiles' admin
-- policy) rather than redefining it.
drop policy if exists "Users can view their own addresses" on public.addresses;
create policy "Users can view their own addresses" on public.addresses
  for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own addresses" on public.addresses;
create policy "Users can insert their own addresses" on public.addresses
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own addresses" on public.addresses;
create policy "Users can update their own addresses" on public.addresses
  for update using (auth.uid() = user_id);

drop policy if exists "Users can delete their own addresses" on public.addresses;
create policy "Users can delete their own addresses" on public.addresses
  for delete using (auth.uid() = user_id);

drop policy if exists "Admins can view all addresses" on public.addresses;
create policy "Admins can view all addresses" on public.addresses
  for select using (is_admin());

commit;
