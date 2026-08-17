-- ============================================================================
-- reviews: restrict public SELECT so author_id never reaches anon/authenticated
-- ============================================================================
-- The "reviews public read" policy (20260706020000_storefront_rls_policies.sql)
-- grants `select using (true)` with NO column restriction, so any caller
-- holding the anon key can bypass the app's own PUBLIC_COLUMNS allowlist
-- (reviews.ts) and read author_id — the reviewer's internal auth.uid() — by
-- calling `supabase.from('reviews').select('*')` directly. This closes that
-- gap at the database layer instead of relying on app-code convention:
--
--   1. Drop the public SELECT policy on the base table. RLS stays enabled
--      with no SELECT policy left, so anon/authenticated get default-deny on
--      public.reviews directly — the same pattern public.orders and
--      public.promo_codes already use.
--   2. Add public.public_reviews, a view whose column list simply excludes
--      author_id — not hidden by convention, but structurally absent from
--      its output. security_invoker = false (the default) so the view runs
--      as its owner (the migration role, which owns the base table and so
--      bypasses its RLS) rather than as the querying anon/authenticated role.
--   3. Grant SELECT on the view — not the base table — to anon + authenticated.
--
-- Row-level access is unchanged: every review is still public. Only the
-- author_id COLUMN is now restricted. Inserts are untouched — an
-- authenticated user still inserts their own review, with their own
-- author_id, straight into public.reviews under the existing
-- "reviews insert own" policy; this migration touches SELECT only.
--
-- Applied by hand (or via `supabase db query --linked`) against production.
-- Wrapped in BEGIN … COMMIT for atomic rollback on any error. Idempotent
-- (DROP POLICY/VIEW IF EXISTS throughout).
-- ============================================================================

begin;

-- ── 1. Base table: remove the wide-open public SELECT policy ───────────────
drop policy if exists "reviews public read" on public.reviews;

-- "reviews insert own" (20260707000000_security_hardening.sql) is untouched —
-- inserts keep working exactly as before. Only SELECT changes here.

-- ── 2. Public-safe view: every reviews column except author_id ─────────────
drop view if exists public.public_reviews;

create view public.public_reviews
with (security_invoker = false) as
select
  id,
  product_id,
  author,
  rating,
  comment,
  created_at
from public.reviews;

comment on view public.public_reviews is
  'Public read surface for reviews. Deliberately omits author_id (the '
  'reviewer''s internal auth.uid()) from its column list — use this view for '
  'any anon/authenticated read; never grant SELECT on the base table '
  'directly. security_invoker = false (the default) so the view runs as its '
  'owner, bypassing the base table''s now-default-deny RLS, rather than as '
  'the querying role.';

-- ── 3. Grant the storefront roles read access to the view only ─────────────
grant select on public.public_reviews to anon, authenticated;

commit;
