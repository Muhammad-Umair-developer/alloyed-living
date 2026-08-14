-- ============================================================================
-- Documentation-only: record the drop of orders_payable_amount_pending_idx
-- ============================================================================
-- This index was created in 20260806000000_bank_transfer_payments.sql to
-- enforce a unique payable_amount among in-flight orders. It was later
-- dropped by hand directly against production, with no migration file
-- recording the change — discovered while researching a promo-code proposal
-- (confirmed via a read-only query against the linked project on
-- 2026-08-14: the index does not exist).
--
-- Payments are matched to orders via the access-token-linked receipt, sender
-- name and transaction reference — NOT by a unique amount — per the comment
-- already in src/lib/data/orders.ts's computeAwaitingAmounts(). This
-- migration changes nothing about that live behavior; it exists purely so
-- migration history matches reality. `drop index if exists` is a no-op today
-- (the index is already gone) and safe to run again.
-- ============================================================================

begin;

drop index if exists public.orders_payable_amount_pending_idx;

commit;
