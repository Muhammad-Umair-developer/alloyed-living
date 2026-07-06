import type { Metadata } from "next"
import LegalPage, { type LegalSection } from "@/src/components/legal/LegalPage"

export const metadata: Metadata = {
  title: "Terms of Use — Alloyed Living",
  description:
    "The terms governing your access to and use of the Alloyed Living website and services.",
}

// Update this when the finalized terms are published.
const LAST_UPDATED = "[ add effective date ]"

// NOTE: No real legal copy was provided, so every substantive section below is a
// [PLACEHOLDER]. Fill each with your finalized text (see the list in the handoff
// notes). Section titles/subsection headings are structural, not legal claims.
const SECTIONS: LegalSection[] = [
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

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of Use"
      lastUpdated={LAST_UPDATED}
      intro="Please read these terms carefully. They govern your access to and use of the Alloyed Living website and services."
      sections={SECTIONS}
    />
  )
}
