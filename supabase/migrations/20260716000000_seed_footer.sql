-- Seed the Footer content page. The footer renders on every storefront page via
-- the root layout, so it has no standalone route. Mirrors FOOTER_DEFAULT_FIELDS
-- in dashboard/src/lib/data/content.ts and FOOTER_DEFAULT in
-- alloyed-living/src/components/layout/Footer.tsx. `on conflict do nothing` keeps
-- this safe to re-run and preserves any admin edits made through the dashboard.
insert into public.content_pages (slug, title, fields, updated_at) values
  ('footer', 'Footer', '{"tagline":"Where bold design meets fine craftsmanship.","phone":"+92 51 123 4567","email":"hello@alloyedliving.com","hours":"Mon – Sat, 10 am – 7 pm PKT","instagramUrl":"https://www.instagram.com/alloyedliving?igsh=MXBhbGdwZWV6ZnE5NQ==","facebookUrl":"https://www.facebook.com/share/1BdEw54ASu/","copyright":"© 2026 Alloyed Living. All rights reserved."}'::jsonb, '2026-07-16T00:00:00.000Z')
on conflict (slug) do nothing;
