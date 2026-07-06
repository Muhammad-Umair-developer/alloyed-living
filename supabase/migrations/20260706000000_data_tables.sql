-- ============================================================================
-- Core data tables — migrate the shared/data/*.json store into Postgres
-- ============================================================================
-- Creates the tables that replace the file-based JSON store:
--   products, orders, reviews, content_pages, settings,
--   product_analytics + daily_stats (counter-based analytics)
--
-- Schema mirrors the structure of shared/data/*.json. Existing string IDs are
-- preserved as text primary keys (e.g. 'p01', 'rv001', 'AL-2026-1001') so all
-- cross-references (reviews.product_id, orders.items[].productId, analytics
-- product_id, home content productIds) keep working after the migration.
--
-- Nested/array fields are stored as jsonb to match the JSON exactly; scalar
-- fields are real columns.
--
-- RLS is intentionally NOT enabled here — it is added in the Phase 2 migration.
--
-- Apply with `supabase db push` (or paste into the Supabase SQL editor).
-- ============================================================================

-- ── products ────────────────────────────────────────────────────────────────
create table if not exists public.products (
  id              text primary key,
  name            text not null,
  material        text not null default '',
  description     text not null default '',
  long_description text,
  price           numeric not null default 0,
  discount_price  numeric,
  category        text not null default '',
  tags            jsonb not null default '[]'::jsonb,
  sizes           jsonb not null default '[]'::jsonb,
  stock           integer not null default 0,
  dimensions      jsonb not null default '{"h":0,"w":0,"d":0}'::jsonb,
  accent          text not null default '',
  image           text not null default '',
  gallery         jsonb not null default '[]'::jsonb,
  gallery_labels  jsonb,
  colors          jsonb,
  features        jsonb,
  seo_title       text,
  seo_description text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists products_category_idx on public.products (category);

-- ── orders ──────────────────────────────────────────────────────────────────
create table if not exists public.orders (
  id               text primary key,
  status           text not null default 'pending',
  items            jsonb not null default '[]'::jsonb,
  customer         jsonb not null default '{}'::jsonb,
  shipping_address jsonb not null default '{}'::jsonb,
  subtotal         numeric not null default 0,
  delivery         numeric not null default 0,
  total            numeric not null default 0,
  payment_status   text,
  payment_provider text,
  payment_ref      text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists orders_payment_ref_idx on public.orders (payment_ref);
create index if not exists orders_created_at_idx on public.orders (created_at desc);

-- ── reviews ─────────────────────────────────────────────────────────────────
create table if not exists public.reviews (
  id         text primary key,
  product_id text not null,
  author     text not null default 'Anonymous',
  author_id  uuid,
  rating     integer not null check (rating between 1 and 5),
  comment    text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists reviews_product_id_idx on public.reviews (product_id);

-- ── content_pages ───────────────────────────────────────────────────────────
create table if not exists public.content_pages (
  slug       text primary key,
  title      text not null default '',
  fields     jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ── settings (singleton row, id = 1) ────────────────────────────────────────
create table if not exists public.settings (
  id            smallint primary key default 1 check (id = 1),
  store_name    text not null default '',
  accent_color  text not null default '',
  support_email text not null default '',
  admins        jsonb not null default '[]'::jsonb,
  api_keys      jsonb not null default '[]'::jsonb
);

-- ── analytics (counter-based, mirrors analytics.json) ───────────────────────
create table if not exists public.product_analytics (
  product_id  text primary key,
  views       integer not null default 0,
  add_to_cart integer not null default 0,
  purchases   integer not null default 0
);

create table if not exists public.daily_stats (
  stat_date date primary key,
  views     integer not null default 0,
  cart_adds integer not null default 0,
  sales     integer not null default 0,
  revenue   numeric not null default 0
);

-- ── Atomic analytics increment functions ────────────────────────────────────
-- Called via supabase.rpc() from the storefront's service-role client. Doing the
-- increment in SQL keeps it atomic (no read-modify-write races) and lets Phase 2
-- keep the tables locked down to the service role.

create or replace function public.track_view(p_product_id text)
returns void
language sql
as $$
  insert into public.product_analytics (product_id, views)
    values (p_product_id, 1)
    on conflict (product_id) do update set views = public.product_analytics.views + 1;
  insert into public.daily_stats (stat_date, views)
    values (current_date, 1)
    on conflict (stat_date) do update set views = public.daily_stats.views + 1;
$$;

create or replace function public.track_add_to_cart(p_product_id text)
returns void
language sql
as $$
  insert into public.product_analytics (product_id, add_to_cart)
    values (p_product_id, 1)
    on conflict (product_id) do update set add_to_cart = public.product_analytics.add_to_cart + 1;
  insert into public.daily_stats (stat_date, cart_adds)
    values (current_date, 1)
    on conflict (stat_date) do update set cart_adds = public.daily_stats.cart_adds + 1;
$$;

create or replace function public.track_purchase(
  p_product_id text,
  p_quantity   integer,
  p_revenue    numeric
)
returns void
language sql
as $$
  insert into public.product_analytics (product_id, purchases)
    values (p_product_id, p_quantity)
    on conflict (product_id) do update set purchases = public.product_analytics.purchases + p_quantity;
  insert into public.daily_stats (stat_date, sales, revenue)
    values (current_date, p_quantity, p_revenue)
    on conflict (stat_date) do update set
      sales = public.daily_stats.sales + p_quantity,
      revenue = public.daily_stats.revenue + p_revenue;
$$;
