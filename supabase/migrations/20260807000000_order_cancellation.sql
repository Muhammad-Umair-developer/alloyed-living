-- ============================================================================
-- Order cancellation support
-- ============================================================================
-- Adds the 'cancelled' fulfillment status plus the columns needed to record a
-- cancellation and its refund (if any): the downpayment actually collected,
-- when/why the order was cancelled, and the refund amount/status.
--
-- Scope: schema only. No application code in src/lib/data/orders.ts or
-- src/lib/checkout/pricing.ts is touched by this migration — those are
-- follow-up work.
--
-- Applied by hand in the Supabase SQL Editor. Wrapped in BEGIN … COMMIT for
-- atomic rollback on any error. Additive and idempotent (IF NOT EXISTS /
-- DROP … IF EXISTS throughout).
-- ============================================================================

begin;

-- ── 1. status CHECK constraint ──────────────────────────────────────────────
-- public.orders.status has never had a CHECK constraint (just a default).
-- Adding one now — covering the existing 5 values plus 'cancelled' — so the
-- new value is enforced at the DB layer the same way payment_status already
-- is. Drop-then-add keeps this idempotent (ADD CONSTRAINT has no IF NOT EXISTS).
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('pending','shipped','delivered','returned','exchanged','cancelled'));

-- ── 2. Cancellation / refund columns ────────────────────────────────────────
alter table public.orders
  add column if not exists downpayment_percent  numeric,
  add column if not exists downpayment_amount   numeric,
  add column if not exists cancelled_at         timestamptz,
  add column if not exists cancellation_reason  text,
  add column if not exists refund_amount        numeric,
  add column if not exists refund_status        text not null default 'none';

alter table public.orders drop constraint if exists orders_refund_status_check;
alter table public.orders add constraint orders_refund_status_check
  check (refund_status in ('none','pending','processed'));

comment on column public.orders.downpayment_percent is
  'Percentage of the order total collected as a downpayment (e.g. COD deposit rate at time of order). Informational; not used in pricing math yet.';
comment on column public.orders.downpayment_amount is
  'Absolute downpayment amount collected, in rupees. Informational; not used in pricing math yet.';
comment on column public.orders.cancelled_at is
  'When the order was cancelled. Null unless status = ''cancelled''.';
comment on column public.orders.cancellation_reason is
  'Free-text reason for cancellation, set by admin or customer flow.';
comment on column public.orders.refund_amount is
  'Amount to refund (or refunded) for a cancelled order, in rupees. Null when no refund applies.';
comment on column public.orders.refund_status is
  'none: no refund needed/started. pending: refund owed, not yet processed. processed: refund completed.';

-- ── 3. Allow payment_status to move freely when status becomes 'cancelled' ──
-- Cancelling an order may need to set/adjust payment_status (e.g. record that
-- a submitted-but-unverified payment is now moot) without satisfying the
-- normal awaiting_payment -> payment_submitted -> payment_verified state
-- machine. Bypass the transition check whenever the row's status is being set
-- to 'cancelled', on insert or update.
create or replace function public.enforce_payment_status_transition()
returns trigger
language plpgsql
as $fn$
declare
  o text;
  n text := coalesce(new.payment_status, '');
begin
  if new.status = 'cancelled' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if n in ('payment_submitted','payment_verified','payment_rejected') then
      raise exception 'Illegal initial payment_status: %', new.payment_status;
    end if;
    return new;
  end if;

  o := coalesce(old.payment_status, '');

  if n is distinct from o then
    if not (
      (o = 'awaiting_payment' and n = 'payment_submitted') or
      (o = 'payment_rejected'  and n = 'payment_submitted') or
      (o = 'payment_submitted' and n = 'payment_verified')  or
      (o = 'payment_submitted' and n = 'payment_rejected')  or
      (o = ''       and n = 'unpaid') or
      (o = 'unpaid' and n = 'paid')   or
      (o = 'unpaid' and n = 'failed') or
      (o = 'failed' and n = 'unpaid')
    ) then
      raise exception 'Illegal payment_status transition: % -> %',
        coalesce(old.payment_status, '<null>'), coalesce(new.payment_status, '<null>');
    end if;
  end if;

  return new;
end
$fn$;

-- Trigger definition itself is unchanged (still BEFORE INSERT OR UPDATE on
-- public.orders, same function name) — no DROP/CREATE TRIGGER needed since
-- CREATE OR REPLACE FUNCTION above updates the body in place.

commit;
