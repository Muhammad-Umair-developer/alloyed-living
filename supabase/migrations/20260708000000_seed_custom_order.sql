-- Seed the Custom Order content page. Mirrors CUSTOM_ORDER_DEFAULT_FIELDS in
-- dashboard/src/lib/data/content.ts. `on conflict do nothing` keeps this safe to
-- re-run and preserves any admin edits made through the dashboard.
insert into public.content_pages (slug, title, fields, updated_at) values
  ('custom-order', 'Custom Order', '{"eyebrow":"Bespoke","heroTitle":"Made For You Alone","heroSubtitle":"You imagined something the world doesn''t have yet — be proud of that. Share your idea and our craftsmen will forge it into a piece that is yours, and yours alone.","steps":[{"title":"Share Your Vision","description":"Describe the piece you dream of — a brand-new idea, or a bold twist on something you already love."},{"title":"We Shape It Together","description":"Our craftsmen turn your concept into a plan — materials, dimensions and finish — and send it back for your blessing."},{"title":"Built By Hand","description":"Your one-of-a-kind piece is forged by hand in our Lahore workshop and delivered to your door."}],"formHeading":"Start Your Commission","formSubheading":"Tell us what you have in mind"}'::jsonb, '2026-07-08T00:00:00.000Z')
on conflict (slug) do nothing;
