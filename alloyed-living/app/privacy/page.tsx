import type { Metadata } from "next"
import { getContentPage } from "@/src/lib/data/content"
import type { PrivacyPageContent } from "@/src/lib/data/types"
import LegalPage, { type LegalSection } from "@/src/components/legal/LegalPage"

export const metadata: Metadata = {
  title: "Privacy Policy — Alloyed Living",
  description:
    "How Alloyed Living collects, uses, shares, and protects your personal information.",
}

// ISR — content changes rarely; matches shipping/returns/terms/etc.
export const revalidate = 300

// Used only by the FALLBACK_SECTIONS path below (no content_pages row yet
// for slug "privacy"). Once a row exists, its own updatedAt renders instead.
const LAST_UPDATED = "[ add effective date ]"

// FALLBACK ONLY — rendered when no content_pages row exists yet for slug
// "privacy", so this page still works before the dashboard's Privacy editor
// has ever been saved (see PrivacyPage below, which prefers the CMS row
// when present). NOTE: no real legal copy was provided, so every
// substantive section below is a [PLACEHOLDER]. Do NOT ship this without
// real copy — data handling claims must be accurate and are
// jurisdiction-specific.
const FALLBACK_SECTIONS: LegalSection[] = [
  {
    id: "introduction",
    title: "Introduction",
    placeholder: true,
  },
  {
    id: "information-we-collect",
    title: "Information We Collect",
    placeholder: true,
    subsections: [
      { title: "Information You Provide", body: [], placeholder: true },
      { title: "Information Collected Automatically", body: [], placeholder: true },
      { title: "Information From Third Parties", body: [], placeholder: true },
    ],
  },
  {
    id: "how-we-use",
    title: "How We Use Your Information",
    placeholder: true,
  },
  {
    id: "cookies",
    title: "Cookies & Tracking Technologies",
    placeholder: true,
  },
  {
    id: "sharing",
    title: "How We Share Your Information",
    placeholder: true,
    subsections: [
      { title: "Third-Party Service Providers", body: [], placeholder: true },
      { title: "Legal & Compliance Disclosures", body: [], placeholder: true },
    ],
  },
  {
    id: "retention",
    title: "Data Retention",
    placeholder: true,
  },
  {
    id: "security",
    title: "Data Security",
    placeholder: true,
  },
  {
    id: "your-rights",
    title: "Your Rights & Choices",
    placeholder: true,
  },
  {
    id: "international-transfers",
    title: "International Data Transfers",
    placeholder: true,
  },
  {
    id: "childrens-privacy",
    title: "Children's Privacy",
    placeholder: true,
  },
  {
    id: "changes",
    title: "Changes to This Policy",
    placeholder: true,
  },
  {
    id: "contact",
    title: "Contact Us",
    body: [
      "Questions or privacy requests can be sent to hello@alloyedliving.com, or through our Contact page. Add any formal data-protection / privacy officer contact details you'd like to include here.",
    ],
  },
]

export default async function PrivacyPage() {
  const page = await getContentPage<PrivacyPageContent>("privacy")
  const sections = page?.fields.sections

  // Live path: a content_pages row exists with real sections — pass them
  // straight through to LegalPage; see terms/page.tsx for the same pattern.
  if (sections && sections.length > 0) {
    return (
      <LegalPage
        eyebrow="Legal"
        title="Privacy Policy"
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
      title="Privacy Policy"
      lastUpdated={LAST_UPDATED}
      intro="This policy explains how Alloyed Living handles your personal information. Replace the placeholder sections below with your finalized, jurisdiction-appropriate policy before publishing."
      sections={FALLBACK_SECTIONS}
    />
  )
}
