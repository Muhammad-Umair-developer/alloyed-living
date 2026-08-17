import type { Metadata } from "next"
import { getContentPage } from "@/src/lib/data/content"
import type { TermsPageContent } from "@/src/lib/data/types"
import LegalPage, { type LegalSection } from "@/src/components/legal/LegalPage"

export const metadata: Metadata = {
  title: "Terms of Use — Alloyed Living",
  description:
    "The terms governing your access to and use of the Alloyed Living website and services.",
}

// ISR — content changes rarely; matches shipping/returns/etc.
export const revalidate = 300

// Used only by the FALLBACK_SECTIONS path below (no content_pages row yet
// for slug "terms"). Once a row exists, its own updatedAt renders instead.
const LAST_UPDATED = "[ add effective date ]"

// FALLBACK ONLY — rendered when no content_pages row exists yet for slug
// "terms", so this page still works before the dashboard's Terms editor has
// ever been saved (see TermsPage below, which prefers the CMS row when
// present). NOTE: no real legal copy was provided, so every substantive
// section below is a [PLACEHOLDER]. Section titles/subsection headings are
// structural, not legal claims.
const FALLBACK_SECTIONS: LegalSection[] = [
  {
    id: "agreement",
    title: "Agreement to Terms",
    placeholder: true,
  },
  {
    id: "eligibility",
    title: "Eligibility & Accounts",
    placeholder: true,
    subsections: [
      { title: "Account Registration", body: [], placeholder: true },
      { title: "Account Security", body: [], placeholder: true },
    ],
  },
  {
    id: "orders",
    title: "Products, Pricing & Orders",
    placeholder: true,
    subsections: [
      { title: "Product Descriptions", body: [], placeholder: true },
      { title: "Pricing & Availability", body: [], placeholder: true },
      { title: "Order Acceptance & Cancellation", body: [], placeholder: true },
    ],
  },
  {
    id: "payment",
    title: "Payment",
    placeholder: true,
  },
  {
    id: "shipping",
    title: "Shipping & Delivery",
    body: [
      "Operational shipping details (rates, delivery windows, coverage) live on our Shipping page. This section should state the contractual terms that apply to delivery — add your finalized copy below.",
    ],
    placeholder: true,
  },
  {
    id: "returns",
    title: "Returns, Exchanges & Cancellations",
    body: [
      "Our current returns process is described on the Returns & Exchanges page. This section should state the binding return terms — add your finalized copy below.",
    ],
    placeholder: true,
  },
  {
    id: "intellectual-property",
    title: "Intellectual Property",
    placeholder: true,
  },
  {
    id: "acceptable-use",
    title: "Acceptable Use & Prohibited Conduct",
    placeholder: true,
  },
  {
    id: "disclaimers",
    title: "Disclaimers & Warranties",
    placeholder: true,
  },
  {
    id: "liability",
    title: "Limitation of Liability",
    placeholder: true,
  },
  {
    id: "indemnification",
    title: "Indemnification",
    placeholder: true,
  },
  {
    id: "governing-law",
    title: "Governing Law & Dispute Resolution",
    placeholder: true,
  },
  {
    id: "changes",
    title: "Changes to These Terms",
    placeholder: true,
  },
  {
    id: "contact",
    title: "Contact Us",
    body: [
      "Questions about these Terms of Use can be sent to hello@alloyedliving.com, or through our Contact page. Add any formal legal / registered-business contact details you'd like to include here.",
    ],
  },
]

export default async function TermsPage() {
  const page = await getContentPage<TermsPageContent>("terms")
  const sections = page?.fields.sections

  // Live path: a content_pages row exists with real sections — pass them
  // straight through to LegalPage. LegalPageSection (types.ts) already
  // matches LegalSection's shape structurally, so no re-parsing/mapping is
  // needed here anymore (paragraphs are stored as real arrays now, not a
  // flat string split at render time).
  if (sections && sections.length > 0) {
    return (
      <LegalPage
        eyebrow="Legal"
        title="Terms of Use"
        lastUpdated={new Date(page!.updatedAt).toLocaleDateString("en-US", { dateStyle: "long" })}
        sections={sections}
      />
    )
  }

  // Fallback: no row yet (or an empty body was saved) — same placeholder
  // copy this page always showed, unchanged.
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of Use"
      lastUpdated={LAST_UPDATED}
      intro="Please read these terms carefully. They govern your access to and use of the Alloyed Living website and services."
      sections={FALLBACK_SECTIONS}
    />
  )
}
