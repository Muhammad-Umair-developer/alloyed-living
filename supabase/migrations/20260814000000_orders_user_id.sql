-- ============================================================================
-- orders.user_id — link orders to an authenticated account
-- ============================================================================
-- Adds a nullable FK from orders to auth.users, plus a one-time backfill that
-- matches existing orders to accounts by email (case-insensitive), for orders
-- placed before this column existed.
--
-- Going forward, user_id is set SERVER-SIDE only, from the session in
-- placeOrderAction (never trusted from client input) — this migration does
-- not change that action; it only adds the column and backfills existing rows.
-- Guest checkout is unaffected: user_id stays null when no session exists.
--
-- Backfill scope, confirmed by a prior read-only pass against this exact
-- linked project (ref wwzmlogzwnzpraiicvjt) before this migration was
-- written: 4 total orders, 0 malformed/empty emails, 0 unmatched, 0 ambiguous
-- (no auth.users email collisions). All 4 match exactly one account.
--
-- Applied by hand (or via `supabase db query --linked`) against production.
-- Wrapped in BEGIN … COMMIT for atomic rollback on any error. Additive and
-- idempotent (IF NOT EXISTS throughout; the backfill's `user_id is null`
-- guard makes it safely re-runnable).
-- ============================================================================

begin;

-- ── 1. Column + index ───────────────────────────────────────────────────────
alter table public.orders
  add column if not exists user_id uuid references auth.users(id) on delete set null;

comment on column public.orders.user_id is
  'Account that placed this order, set server-side only from the session at checkout (never client input). Null for guest checkout and for pre-2026-08-14 orders that could not be matched by email.';

create index if not exists orders_user_id_idx on public.orders (user_id);

-- ── 2. One-time backfill for existing orders ────────────────────────────────
-- Matches by email (case-insensitive) against auth.users — the canonical,
-- live email, not the profiles table's copy taken at signup. Only claims a
-- row when exactly one account matches (re-derived at write time, not
-- trusted from the earlier read), and only where user_id is still null, so
-- this is safe to re-run.
update public.orders o
set user_id = u.id,
    updated_at = now()
from auth.users u
where o.user_id is null
  and o.customer ->> 'email' is not null
  and trim(o.customer ->> 'email') <> ''
  and lower(u.email) = lower(trim(o.customer ->> 'email'))
  and (
    select count(*) from auth.users u2
    where lower(u2.email) = lower(trim(o.customer ->> 'email'))
  ) = 1;

commit;
