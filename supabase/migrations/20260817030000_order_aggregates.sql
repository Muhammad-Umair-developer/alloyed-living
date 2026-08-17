-- ============================================================================
-- orders: two aggregate RPCs backing the dashboard Overview and Purchases
-- summary cards, replacing full unbounded order fetches used only to derive
-- a handful of numbers.
-- ============================================================================
-- Both are plain SQL functions in the same style as the existing
-- track_view/track_add_to_cart/track_purchase functions (20260706000000_
-- data_tables.sql) — no security definer, no explicit grants needed, since
-- these are only ever called via the service-role admin client, which
-- already bypasses RLS the same way every other orders query in this
-- codebase does.
--
-- Applied by hand (or via `supabase db query --linked`) against production.
-- Wrapped in BEGIN … COMMIT for atomic rollback on any error. `create or
-- replace function` is naturally idempotent — safe to re-run.
-- ============================================================================

begin;

-- Order status distribution — powers the Overview page's status pie chart.
-- Replaces a full unbounded select("*") of every order with one GROUP BY.
create or replace function public.order_status_counts()
returns table (status text, count bigint)
language sql
stable
as $$
  select status, count(*) as count
  from public.orders
  group by status;
$$;

-- All-time purchases summary — powers the Purchases page's summary cards
-- (Total Purchases, Items Sold, Returned, Exchanged), decoupled from
-- whatever powers the itemized table below them. Items are stored as a
-- jsonb array per order (no separate order_items table), so item-quantity
-- sums need jsonb_array_elements — not expressible via PostgREST's query
-- builder, hence a function rather than a plain .select().
--
-- count(distinct o.id) vs sum(quantity): the lateral join multiplies rows
-- per item, so order counts must be DISTINCT while item-quantity sums run
-- over the exploded per-item rows — mixing these up would over-count orders.
create or replace function public.purchases_summary()
returns table (
  total_orders     bigint,
  items_purchased  bigint,
  returned_orders  bigint,
  returned_items   bigint,
  exchanged_orders bigint,
  exchanged_items  bigint
)
language sql
stable
as $$
  select
    count(distinct o.id) as total_orders,
    coalesce(sum((elem->>'quantity')::int), 0) as items_purchased,
    count(distinct o.id) filter (where o.status = 'returned') as returned_orders,
    coalesce(sum((elem->>'quantity')::int) filter (where o.status = 'returned'), 0) as returned_items,
    count(distinct o.id) filter (where o.status = 'exchanged') as exchanged_orders,
    coalesce(sum((elem->>'quantity')::int) filter (where o.status = 'exchanged'), 0) as exchanged_items
  from public.orders o
  left join lateral jsonb_array_elements(coalesce(o.items, '[]'::jsonb)) as elem on true;
$$;

commit;
