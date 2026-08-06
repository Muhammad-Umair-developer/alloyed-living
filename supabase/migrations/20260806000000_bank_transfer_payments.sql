-- ============================================================================
-- Bank transfer + COD deposit payments
-- ============================================================================
-- Adds the manual bank-transfer / COD-deposit verification lifecycle to
-- public.orders. Safepay columns (payment_provider, payment_ref, access_token)
-- are KEPT — access_token is actively reused by the confirmation page.
--
-- payment_status lifecycle:
--   awaiting_payment -> payment_submitted -> payment_verified   (admin approve)
--                                         -> payment_rejected -> payment_submitted
--
-- CONTEXT: applied by hand in the Supabase SQL Editor against production. The
-- orders table is empty at apply time, so there is NO legacy backfill. The whole
-- migration is wrapped in BEGIN … COMMIT so any failure rolls back atomically.
-- Additive and idempotent (IF NOT EXISTS / DROP … IF EXISTS throughout). Nothing
-- outside public.orders is touched except the single payment-methods seed row.
--
-- Plain CREATE INDEX (not CONCURRENTLY) is used on purpose so every statement is
-- transaction-safe; the table is empty, so the brief lock is irrelevant.
-- ============================================================================

begin;

-- ── 1. Columns (all nullable except payment_flagged) ────────────────────────
alter table public.orders
  add column if not exists payment_method            text,
  add column if not exists payment_receipt_path       text,
  add column if not exists payment_receipt_hash        text,
  add column if not exists payment_sender_name          text,
  add column if not exists payment_sender_mobile         text,
  add column if not exists payment_reference              text,
  add column if not exists payment_flagged      boolean not null default false,
  add column if not exists payment_flag_reason            text,
  add column if not exists payable_amount                numeric,
  add column if not exists deposit_amount                 numeric,
  add column if not exists cod_balance_due                 numeric,
  add column if not exists payment_submitted_at             timestamptz,
  add column if not exists payment_verified_at               timestamptz,
  add column if not exists payment_verified_by                uuid,
  add column if not exists payment_rejection_reason            text;

comment on column public.orders.payable_amount is
  'Server-computed unique amount to transfer (base + 1-99 paisa). NEVER accepted from the client.';
comment on column public.orders.deposit_amount is
  'COD only: amount collected upfront = payable_amount (min(500,total) base + paisa/drift).';
comment on column public.orders.cod_balance_due is
  'COD only: max(0, order total - deposit_amount). Balance the courier collects on delivery.';
comment on column public.orders.payment_receipt_hash is
  'SHA-256 of the uploaded receipt bytes. Used for duplicate-receipt flagging.';
comment on column public.orders.payment_receipt_path is
  'Object path in the PRIVATE payment-receipts bucket. Admin views it via a signed URL only.';
comment on column public.orders.payment_verified_by is
  'profiles.id of the admin who verified the payment. Set only by an authenticated dashboard action.';

-- ── 2. CHECK constraints ────────────────────────────────────────────────────
-- Drop-then-add keeps this idempotent (ADD CONSTRAINT has no IF NOT EXISTS).
-- 'safepay' is retained in payment_method as a safety margin; the legacy Safepay
-- payment_status values are retained so historical writes never violate.
alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders add constraint orders_payment_status_check
  check (payment_status is null or payment_status in (
    'unpaid','paid','failed',
    'awaiting_payment','payment_submitted','payment_verified','payment_rejected'
  ));

alter table public.orders drop constraint if exists orders_payment_method_check;
alter table public.orders add constraint orders_payment_method_check
  check (payment_method is null or payment_method in ('cod','ubl','jazzcash','safepay'));

-- ── 3. Indexes ──────────────────────────────────────────────────────────────
create index if not exists orders_payment_receipt_hash_idx
  on public.orders (payment_receipt_hash);

-- Admin "New Orders" queue.
create index if not exists orders_payment_submitted_idx
  on public.orders (payment_submitted_at desc)
  where payment_status = 'payment_submitted';

-- Unique payable amount among in-flight orders only, so one bank-statement line
-- matches exactly one pending order. The server retries on a 23505 conflict.
create unique index if not exists orders_payable_amount_pending_idx
  on public.orders (payable_amount)
  where payment_status in ('awaiting_payment','payment_submitted');

-- ── 4. Orders RLS: default-deny ─────────────────────────────────────────────
-- Every legitimate access goes through the service-role client (BYPASSRLS).
-- Enabling RLS with NO policy denies anon + authenticated all access via
-- PostgREST, so a customer cannot set their own payment_status. Drop any
-- existing policy first; add none.
do $do$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
     where schemaname = 'public' and tablename = 'orders'
  loop
    execute format('drop policy if exists %I on public.orders', pol.policyname);
  end loop;
end
$do$;

alter table public.orders enable row level security;

-- ── 5. Transition-enforcement trigger ───────────────────────────────────────
-- Enforces the payment_status state machine at the DB layer. Triggers fire even
-- for the service-role client (BYPASSRLS does not bypass triggers), so no write
-- can jump an order straight to payment_verified. Legacy Safepay transitions are
-- kept permitted as a safety margin; they simply go unused once Safepay is gone.
create or replace function public.enforce_payment_status_transition()
returns trigger
language plpgsql
as $fn$
declare
  o text;
  n text := coalesce(new.payment_status, '');
begin
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

drop trigger if exists orders_payment_status_transition on public.orders;
create trigger orders_payment_status_transition
  before insert or update on public.orders
  for each row execute function public.enforce_payment_status_transition();

-- ── 6. Private receipts bucket ──────────────────────────────────────────────
-- public = false: not web-readable. Uploads (customer) and reads (admin, via
-- short-lived signed URLs) both go through the service-role client, which
-- bypasses storage RLS. No storage.objects policy is added. 5 MB cap + a strict
-- MIME allowlist. on conflict do update so re-running enforces the same limits.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-receipts',
  'payment-receipts',
  false,
  5242880,  -- 5 MB
  array['image/jpeg','image/png','image/webp','application/pdf']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ── 7. payment-methods content seed ─────────────────────────────────────────
-- Admin-editable bank details shown at checkout and in the payment emails.
-- Empty placeholders; on conflict do nothing so a re-run never clobbers edits.
insert into public.content_pages (slug, title, fields, updated_at)
values (
  'payment-methods',
  'Payment Methods',
  jsonb_build_object(
    'ubl', jsonb_build_object(
      'accountTitle', '',
      'bankName',     'United Bank Limited (UBL)',
      'accountNumber','',
      'iban',         ''
    ),
    'jazzcash', jsonb_build_object(
      'accountTitle', '',
      'number',       ''
    )
  ),
  now()
)
on conflict (slug) do nothing;

commit;
