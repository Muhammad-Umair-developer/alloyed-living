-- ============================================================================
-- deposit_account — which account a COD deposit was sent to
-- ============================================================================
-- Follow-up to 20260806000000_bank_transfer_payments.sql. When a customer picks
-- Cash on Delivery they then choose UBL or JazzCash for the Rs 500 deposit; this
-- records which one, so payment verification, the confirmation page, and the
-- emails show/check the right account. NULL for direct ubl/jazzcash orders —
-- there, payment_method already carries the account.
--
-- Applied by hand in the Supabase SQL Editor. Wrapped in BEGIN … COMMIT for
-- atomic rollback on any error. Additive and idempotent. Touches only
-- public.orders. Every statement is transaction-safe.
-- ============================================================================

begin;

alter table public.orders
  add column if not exists deposit_account text;

comment on column public.orders.deposit_account is
  'COD only: account the Rs 500 deposit was sent to (ubl|jazzcash). NULL for direct ubl/jazzcash orders, where payment_method carries the account.';

-- Value domain AND the "COD only" rule in one constraint: a non-null
-- deposit_account is allowed only on a COD order. Drop-then-add for idempotency.
alter table public.orders drop constraint if exists orders_deposit_account_check;
alter table public.orders add constraint orders_deposit_account_check
  check (
    deposit_account is null
    or (deposit_account in ('ubl','jazzcash') and payment_method = 'cod')
  );

commit;
