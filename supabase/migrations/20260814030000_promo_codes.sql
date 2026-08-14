-- ============================================================================
-- Promo / coupon codes
-- ============================================================================
-- Schema only — no application code in this migration. Validation/redemption
-- logic lives in priceOrderItems (alloyed-living/src/lib/checkout/pricing.ts),
-- the existing single source of truth for order pricing; a dashboard admin
-- UI manages the rows. Both are follow-up work, not part of this migration.
--
-- Decisions locked in for this migration (see prior planning discussion):
--   - id (uuid) is the PK, not code — code can be edited without disturbing
--     any reference (orders reference it by immutable text snapshot, not FK;
--     see part 2 below).
--   - code uniqueness is case-insensitive (unique index on lower(code)).
--   - discount_value's valid range depends on discount_type, enforced by a
--     CHECK constraint at the DB layer, not just app validation.
--   - times_used is a maintained counter, atomically guarded at increment
--     time by application code (WHERE times_used < max_uses OR max_uses IS
--     NULL) — never a derived COUNT(*), to avoid a redemption race
--     overshooting max_uses. This migration adds the column; the guarded
--     increment itself is application code (follow-up).
--   - RLS is default-deny: no anon/authenticated policies. All access is via
--     the service-role client (server-side checkout validation, dashboard
--     admin actions) — mirrors orders' own RLS approach.
--   - Hard-deleting a code that has already been used (times_used > 0) is
--     blocked at the DB layer by a trigger, not just app-level UI
--     restriction — deactivate (active = false) is the only supported way to
--     retire a used code, so historical orders' discount_code references
--     never point at a vanished row.
--
-- Applied by hand (or via `supabase db query --linked`) against production.
-- Wrapped in BEGIN … COMMIT for atomic rollback on any error. Additive and
-- idempotent (IF NOT EXISTS / DROP … IF EXISTS throughout).
-- ============================================================================

begin;

-- ── 1. promo_codes ───────────────────────────────────────────────────────────
create table if not exists public.promo_codes (
  id                     uuid primary key default gen_random_uuid(),
  code                   text not null,
  discount_type          text not null,
  discount_value         numeric not null,
  max_discount_amount    numeric,          -- percentage-type cap, e.g. "15% off, max PKR 5,000". Null = uncapped.
  min_order_value        numeric,          -- against subtotal; null = no minimum
  max_uses               integer,          -- total redemptions across all customers; null = unlimited
  max_uses_per_customer  integer,          -- per user_id; null = unlimited
  times_used             integer not null default 0,
  active                 boolean not null default true,
  expires_at             timestamptz,      -- null = never expires
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

comment on column public.promo_codes.max_discount_amount is
  'Cap on the discount amount for percentage-type codes (e.g. 15% off, capped at PKR 5,000). Null = uncapped. Not applicable to flat-type codes.';
comment on column public.promo_codes.times_used is
  'Maintained counter, incremented atomically (guarded on max_uses) at order-creation time — never derived from a live COUNT(*). See priceOrderItems / createOrder (follow-up work).';
comment on column public.promo_codes.max_uses_per_customer is
  'Per-user_id redemption cap, enforced against orders.user_id + orders.discount_code at validation time (follow-up work). Null = unlimited per customer.';

-- Case-insensitive uniqueness: SAVE10 and save10 are the same code.
create unique index if not exists promo_codes_code_lower_idx on public.promo_codes (lower(code));

-- discount_type domain + range checks, one constraint per concern so a
-- failure names exactly what's wrong.
alter table public.promo_codes drop constraint if exists promo_codes_discount_type_check;
alter table public.promo_codes add constraint promo_codes_discount_type_check
  check (discount_type in ('percentage', 'flat'));

alter table public.promo_codes drop constraint if exists promo_codes_discount_value_range_check;
alter table public.promo_codes add constraint promo_codes_discount_value_range_check
  check (
    (discount_type = 'percentage' and discount_value > 0 and discount_value <= 100)
    or (discount_type = 'flat' and discount_value > 0)
  );

alter table public.promo_codes drop constraint if exists promo_codes_max_discount_amount_check;
alter table public.promo_codes add constraint promo_codes_max_discount_amount_check
  check (max_discount_amount is null or max_discount_amount > 0);

alter table public.promo_codes drop constraint if exists promo_codes_min_order_value_check;
alter table public.promo_codes add constraint promo_codes_min_order_value_check
  check (min_order_value is null or min_order_value >= 0);

alter table public.promo_codes drop constraint if exists promo_codes_max_uses_check;
alter table public.promo_codes add constraint promo_codes_max_uses_check
  check (max_uses is null or max_uses > 0);

alter table public.promo_codes drop constraint if exists promo_codes_max_uses_per_customer_check;
alter table public.promo_codes add constraint promo_codes_max_uses_per_customer_check
  check (max_uses_per_customer is null or max_uses_per_customer > 0);

alter table public.promo_codes drop constraint if exists promo_codes_times_used_nonneg_check;
alter table public.promo_codes add constraint promo_codes_times_used_nonneg_check
  check (times_used >= 0);

-- RLS: default-deny. Enabling with NO policy denies anon + authenticated all
-- access via PostgREST; every legitimate access goes through the
-- service-role client, same approach as public.orders.
alter table public.promo_codes enable row level security;

-- Block hard-deleting a code that's already been redeemed — deactivate
-- (active = false) is the only supported way to retire a used code, so a
-- historical order's discount_code snapshot never points at a row that no
-- longer exists. Enforced at the DB layer so this holds even for the
-- service-role client, same pattern as enforce_payment_status_transition.
create or replace function public.prevent_used_promo_code_delete()
returns trigger
language plpgsql
as $fn$
begin
  if old.times_used > 0 then
    raise exception
      'Cannot delete promo code "%": it has already been used % time(s). Deactivate it instead.',
      old.code, old.times_used;
  end if;
  return old;
end;
$fn$;

drop trigger if exists promo_codes_prevent_used_delete on public.promo_codes;
create trigger promo_codes_prevent_used_delete
  before delete on public.promo_codes
  for each row execute function public.prevent_used_promo_code_delete();

-- ── 2. orders: immutable discount snapshot ──────────────────────────────────
-- Recorded at order-creation time from whatever promo_codes said at that
-- moment. Never re-derived from promo_codes later, so editing or deactivating
-- a code never retroactively changes what a past order appears to have
-- received — same principle as downpayment_amount/refund_amount.
alter table public.orders
  add column if not exists discount_code   text,
  add column if not exists discount_amount numeric not null default 0;

comment on column public.orders.discount_code is
  'Promo code applied at checkout, if any — an immutable text snapshot, NOT a foreign key. Editing/deleting the promo_codes row later never changes this.';
comment on column public.orders.discount_amount is
  'Discount amount actually applied at checkout, in rupees. 0 when no code was used. Immutable snapshot, computed server-side in priceOrderItems — never trusted from the client.';

alter table public.orders drop constraint if exists orders_discount_amount_nonneg_check;
alter table public.orders add constraint orders_discount_amount_nonneg_check
  check (discount_amount >= 0);

commit;
