-- ============================================================================
-- Phase 2 RLS — storefront read policies
-- ============================================================================
-- The data tables have RLS enabled but no policies, so the anon (publishable)
-- key the storefront uses can neither read nor write them. The storefront reads
-- products, content_pages, and reviews with the anon server client, so those get
-- public SELECT policies. A signed-in shopper may also submit a review tied to
-- their own auth.uid().
--
-- orders, product_analytics, daily_stats, and settings are intentionally left
-- without anon policies: every access to them goes through the service-role
-- client (order creation, the Safepay webhook, analytics tracking, admin), which
-- bypasses RLS entirely. They stay locked to the public API.
--
-- Ensure RLS is on (idempotent) before (re)creating policies.
-- ============================================================================

alter table public.products      enable row level security;
alter table public.content_pages enable row level security;
alter table public.reviews       enable row level security;

drop policy if exists "products public read"   on public.products;
drop policy if exists "content public read"     on public.content_pages;
drop policy if exists "reviews public read"     on public.reviews;
drop policy if exists "reviews insert own"      on public.reviews;

create policy "products public read" on public.products
  for select using (true);

create policy "content public read" on public.content_pages
  for select using (true);

create policy "reviews public read" on public.reviews
  for select using (true);

-- Anon reviews (author_id null) allowed so the feature works pre-login; a
-- signed-in user may only write a review tied to their own auth.uid().
create policy "reviews insert own" on public.reviews
  for insert with check (author_id is null or author_id = auth.uid());
