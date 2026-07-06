-- ============================================================================
-- Security hardening (pre-deployment audit fixes)
-- ============================================================================

-- ── C3: opaque order access token ───────────────────────────────────────────
-- Order IDs are human-friendly and guessable (AL-YYYY-NNNN), so the checkout
-- success page must not accept them for lookups. Each order gets a random UUID
-- token; only the token is placed in redirect URLs. Default fills existing rows.
alter table public.orders
  add column if not exists access_token uuid not null default gen_random_uuid();
create unique index if not exists orders_access_token_idx
  on public.orders (access_token);

-- ── H2: reviews may no longer be inserted anonymously ───────────────────────
-- The old policy allowed author_id IS NULL inserts, letting anyone with the
-- publishable anon key plant reviews directly via the REST API. Reviews now
-- require a signed-in user writing under their own auth.uid() — matching the
-- app, which already requires sign-in in submitReviewAction.
drop policy if exists "reviews insert own" on public.reviews;
create policy "reviews insert own" on public.reviews
  for insert with check (author_id is not null and author_id = auth.uid());

-- ── C4: media bucket for dashboard uploads ──────────────────────────────────
-- Replaces local-filesystem uploads (which break on serverless hosts). Public
-- bucket: objects are readable via /storage/v1/object/public/media/<name>;
-- writes go through the dashboard's service-role client only (bypasses RLS),
-- so no insert policy is added for anon/authenticated.
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;
