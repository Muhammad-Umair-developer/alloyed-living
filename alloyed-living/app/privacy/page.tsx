import type { Metadata } from "next"
import LegalPage, { type LegalSection } from "@/src/components/legal/LegalPage"

export const metadata: Metadata = {
  title: "Privacy Policy — Alloyed Living",
  description:
    "How Alloyed Living collects, uses, shares, and protects your personal information.",
}

// Update this when the finalized policy is published.
const LAST_UPDATED = "[ add effective date ]"

// NOTE: No real legal copy was provided, so every substantive section below is a
// [PLACEHOLDER]. Fill each with your finalized text (see the list in the handoff
// notes). Do NOT ship this without real copy — data handling claims must be
// accurate and are jurisdiction-specific.
const SECTIONS: LegalSection[] = [
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

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      lastUpdated={LAST_UPDATED}
      intro="This policy explains how Alloyed Living handles your personal information. Replace the placeholder sections below with your finalized, jurisdiction-appropriate policy before publishing."
      sections={SECTIONS}
    />
  )
}
