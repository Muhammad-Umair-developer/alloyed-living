-- ============================================================================
-- content_pages: upgrade "terms" and "privacy" from flat { body } to
-- structured { sections } matching LegalPage.tsx's LegalSection shape
-- ============================================================================
-- Two statements per slug:
--   1. UPDATE any row still in the old { "body": "..." } shape into the new
--      { "sections": [...] } skeleton (Option B — ported from the hardcoded
--      FALLBACK_SECTIONS titles in terms/page.tsx and privacy/page.tsx).
--      Guarded by `not (fields ? 'sections')` so it only touches old-shape
--      rows — never re-runs against an already-migrated row.
--   2. INSERT ... ON CONFLICT DO NOTHING for the case where no row exists at
--      all yet (this migration doesn't require 20260817010000 to have run
--      first). No-ops if statement 1 already created/updated the row.
--
-- "terms" already has real content (seeded 20260706010000, a single
-- sentence). Its UPDATE reads the EXISTING body text at transform time via
-- fields->>'body' and places it as the sole paragraph of the "Agreement to
-- Terms" section (index 0) — the natural fit for "by placing an order...
-- you agree to..." framing. Every other terms/privacy section starts empty
-- EXCEPT "shipping", "returns", and "contact" (terms) and "contact"
-- (privacy), which carry over the same cross-reference/contact copy the
-- hardcoded fallback already showed — genuinely useful permanent text, not
-- placeholder filler.
--
-- Applied by hand (or via `supabase db query --linked`) against production.
-- Wrapped in BEGIN … COMMIT for atomic rollback on any error. Idempotent —
-- safe to re-run; a fully-migrated row is left untouched either way.
-- ============================================================================

begin;

-- ── terms ────────────────────────────────────────────────────────────────────

update public.content_pages
set fields = jsonb_set(
  '{
    "sections": [
      { "id": "agreement", "title": "Agreement to Terms", "body": [] },
      { "id": "eligibility", "title": "Eligibility & Accounts", "body": [],
        "subsections": [
          { "title": "Account Registration", "body": [] },
          { "title": "Account Security", "body": [] }
        ] },
      { "id": "orders", "title": "Products, Pricing & Orders", "body": [],
        "subsections": [
          { "title": "Product Descriptions", "body": [] },
          { "title": "Pricing & Availability", "body": [] },
          { "title": "Order Acceptance & Cancellation", "body": [] }
        ] },
      { "id": "payment", "title": "Payment", "body": [] },
      { "id": "shipping", "title": "Shipping & Delivery", "body": [
        "Operational shipping details (rates, delivery windows, coverage) live on our Shipping page. This section should state the contractual terms that apply to delivery — add your finalized copy below."
      ] },
      { "id": "returns", "title": "Returns, Exchanges & Cancellations", "body": [
        "Our current returns process is described on the Returns & Exchanges page. This section should state the binding return terms — add your finalized copy below."
      ] },
      { "id": "intellectual-property", "title": "Intellectual Property", "body": [] },
      { "id": "acceptable-use", "title": "Acceptable Use & Prohibited Conduct", "body": [] },
      { "id": "disclaimers", "title": "Disclaimers & Warranties", "body": [] },
      { "id": "liability", "title": "Limitation of Liability", "body": [] },
      { "id": "indemnification", "title": "Indemnification", "body": [] },
      { "id": "governing-law", "title": "Governing Law & Dispute Resolution", "body": [] },
      { "id": "changes", "title": "Changes to These Terms", "body": [] },
      { "id": "contact", "title": "Contact Us", "body": [
        "Questions about these Terms of Use can be sent to hello@alloyedliving.com, or through our Contact page. Add any formal legal / registered-business contact details you''d like to include here."
      ] }
    ]
  }'::jsonb,
  '{sections,0,body}',
  to_jsonb(array_remove(
    regexp_split_to_array(trim(both from coalesce(fields->>'body', '')), '\n{2,}'),
    ''
  ))
),
updated_at = now()
where slug = 'terms'
  and not (fields ? 'sections');

insert into public.content_pages (slug, title, fields, updated_at)
values (
  'terms', 'Terms & Conditions',
  '{
    "sections": [
      { "id": "agreement", "title": "Agreement to Terms", "body": [] },
      { "id": "eligibility", "title": "Eligibility & Accounts", "body": [],
        "subsections": [
          { "title": "Account Registration", "body": [] },
          { "title": "Account Security", "body": [] }
        ] },
      { "id": "orders", "title": "Products, Pricing & Orders", "body": [],
        "subsections": [
          { "title": "Product Descriptions", "body": [] },
          { "title": "Pricing & Availability", "body": [] },
          { "title": "Order Acceptance & Cancellation", "body": [] }
        ] },
      { "id": "payment", "title": "Payment", "body": [] },
      { "id": "shipping", "title": "Shipping & Delivery", "body": [
        "Operational shipping details (rates, delivery windows, coverage) live on our Shipping page. This section should state the contractual terms that apply to delivery — add your finalized copy below."
      ] },
      { "id": "returns", "title": "Returns, Exchanges & Cancellations", "body": [
        "Our current returns process is described on the Returns & Exchanges page. This section should state the binding return terms — add your finalized copy below."
      ] },
      { "id": "intellectual-property", "title": "Intellectual Property", "body": [] },
      { "id": "acceptable-use", "title": "Acceptable Use & Prohibited Conduct", "body": [] },
      { "id": "disclaimers", "title": "Disclaimers & Warranties", "body": [] },
      { "id": "liability", "title": "Limitation of Liability", "body": [] },
      { "id": "indemnification", "title": "Indemnification", "body": [] },
      { "id": "governing-law", "title": "Governing Law & Dispute Resolution", "body": [] },
      { "id": "changes", "title": "Changes to These Terms", "body": [] },
      { "id": "contact", "title": "Contact Us", "body": [
        "Questions about these Terms of Use can be sent to hello@alloyedliving.com, or through our Contact page. Add any formal legal / registered-business contact details you''d like to include here."
      ] }
    ]
  }'::jsonb,
  now()
)
on conflict (slug) do nothing;

-- ── privacy ──────────────────────────────────────────────────────────────────
-- No existing real body to preserve — the seed migration leaves it ''.

update public.content_pages
set fields = '{
  "sections": [
    { "id": "introduction", "title": "Introduction", "body": [] },
    { "id": "information-we-collect", "title": "Information We Collect", "body": [],
      "subsections": [
        { "title": "Information You Provide", "body": [] },
        { "title": "Information Collected Automatically", "body": [] },
        { "title": "Information From Third Parties", "body": [] }
      ] },
    { "id": "how-we-use", "title": "How We Use Your Information", "body": [] },
    { "id": "cookies", "title": "Cookies & Tracking Technologies", "body": [] },
    { "id": "sharing", "title": "How We Share Your Information", "body": [],
      "subsections": [
        { "title": "Third-Party Service Providers", "body": [] },
        { "title": "Legal & Compliance Disclosures", "body": [] }
      ] },
    { "id": "retention", "title": "Data Retention", "body": [] },
    { "id": "security", "title": "Data Security", "body": [] },
    { "id": "your-rights", "title": "Your Rights & Choices", "body": [] },
    { "id": "international-transfers", "title": "International Data Transfers", "body": [] },
    { "id": "childrens-privacy", "title": "Children''s Privacy", "body": [] },
    { "id": "changes", "title": "Changes to This Policy", "body": [] },
    { "id": "contact", "title": "Contact Us", "body": [
      "Questions or privacy requests can be sent to hello@alloyedliving.com, or through our Contact page. Add any formal data-protection / privacy officer contact details you''d like to include here."
    ] }
  ]
}'::jsonb,
updated_at = now()
where slug = 'privacy'
  and not (fields ? 'sections');

insert into public.content_pages (slug, title, fields, updated_at)
values (
  'privacy', 'Privacy Policy',
  '{
    "sections": [
      { "id": "introduction", "title": "Introduction", "body": [] },
      { "id": "information-we-collect", "title": "Information We Collect", "body": [],
        "subsections": [
          { "title": "Information You Provide", "body": [] },
          { "title": "Information Collected Automatically", "body": [] },
          { "title": "Information From Third Parties", "body": [] }
        ] },
      { "id": "how-we-use", "title": "How We Use Your Information", "body": [] },
      { "id": "cookies", "title": "Cookies & Tracking Technologies", "body": [] },
      { "id": "sharing", "title": "How We Share Your Information", "body": [],
        "subsections": [
          { "title": "Third-Party Service Providers", "body": [] },
          { "title": "Legal & Compliance Disclosures", "body": [] }
        ] },
      { "id": "retention", "title": "Data Retention", "body": [] },
      { "id": "security", "title": "Data Security", "body": [] },
      { "id": "your-rights", "title": "Your Rights & Choices", "body": [] },
      { "id": "international-transfers", "title": "International Data Transfers", "body": [] },
      { "id": "childrens-privacy", "title": "Children''s Privacy", "body": [] },
      { "id": "changes", "title": "Changes to This Policy", "body": [] },
      { "id": "contact", "title": "Contact Us", "body": [
        "Questions or privacy requests can be sent to hello@alloyedliving.com, or through our Contact page. Add any formal data-protection / privacy officer contact details you''d like to include here."
      ] }
    ]
  }'::jsonb,
  now()
)
on conflict (slug) do nothing;

commit;
