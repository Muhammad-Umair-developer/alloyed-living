-- ============================================================================
-- content_pages: seed starter rows for "terms" and "privacy"
-- ============================================================================
-- The dashboard's Terms/Privacy editors 404 (and the pages don't appear in
-- the /content grid) until a content_pages row exists for their slug — same
-- gate every other content page goes through (getContentPage returns null,
-- [slug]/page.tsx calls notFound()). This seeds one starter row each, with
-- an EMPTY body, so both editors become reachable immediately without
-- overwriting anything:
--
--   - body is deliberately '' (empty), not placeholder text. Both
--     terms/page.tsx and privacy/page.tsx only render the CMS body once
--     body.trim() is non-empty; an empty body falls through to the
--     storefront's existing structured FALLBACK_SECTIONS (the nicer
--     per-section placeholder UI), so the live pages look exactly as they
--     do today until real copy is saved from the dashboard.
--   - ON CONFLICT (slug) DO NOTHING — never overwrites a row that already
--     exists. "terms" already has a real seeded row (20260706010000_seed_
--     data.sql) with content dated 2026-07-08, so this is a guaranteed
--     no-op for "terms" and only actually inserts "privacy".
--
-- Applied by hand (or via `supabase db query --linked`) against production.
-- Wrapped in BEGIN … COMMIT for atomic rollback on any error. Idempotent —
-- safe to re-run.
-- ============================================================================

begin;

insert into public.content_pages (slug, title, fields, updated_at)
values
  ('terms',   'Terms & Conditions', '{"body": ""}'::jsonb, now()),
  ('privacy', 'Privacy Policy',     '{"body": ""}'::jsonb, now())
on conflict (slug) do nothing;

commit;
