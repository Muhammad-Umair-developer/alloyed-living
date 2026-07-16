import Link from "next/link"
import { getContentPage } from "@/src/lib/data/content"
import type { FooterPageContent } from "@/src/lib/data/types"

// ─── Constants ────────────────────────────────────────────────────────────────

const EDITORIAL: React.CSSProperties = {
  fontFamily: "var(--font-editorial, 'Cormorant Garamond', Georgia, serif)",
}

// Fallback used when the footer content row hasn't been seeded yet. Mirrors
// FOOTER_DEFAULT_FIELDS in dashboard/src/lib/data/content.ts and the seed
// migration — keep the three in sync.
const FOOTER_DEFAULT: FooterPageContent = {
  tagline: "Where bold design meets fine craftsmanship.",
  phone: "+92 51 123 4567",
  email: "hello@alloyedliving.com",
  hours: "Mon – Sat, 10 am – 7 pm PKT",
  instagramUrl: "https://www.instagram.com/alloyedliving?igsh=MXBhbGdwZWV6ZnE5NQ==",
  facebookUrl: "https://www.facebook.com/share/1BdEw54ASu/",
  copyright: "© 2026 Alloyed Living. All rights reserved.",
}

const NAV_LINKS = [
  { label: "Home",       href: "/"        },
  { label: "Shop",       href: "/shop"    },
  { label: "Contact Us", href: "/contact" },
  { label: "Login",      href: "/login"   },
]

const CARE_LINKS = [
  { label: "Shipping Details",     href: "/shipping"         },
  { label: "Returns & Exchanges", href: "/returns"          },
  { label: "Factory Location",    href: "/factory-location" },
  { label: "Product Catalog",     href: "/catalog"          },
]

// ─── FooterLink ───────────────────────────────────────────────────────────────

function FooterLink({ label, href }: { label: string; href: string }) {
  return (
    <li>
      <Link
        href={href}
        className="
          relative inline-block
          text-[11px] tracking-[0.14em] text-neutral-100
          cursor-pointer transition-colors duration-300 hover:text-white
          after:absolute after:bottom-[-1px] after:left-0
          after:h-px after:w-0 after:bg-white after:content-['']
          after:transition-[width] after:duration-300 after:ease-out
          hover:after:w-full
        "
      >
        {label}
      </Link>
    </li>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────

export default async function Footer() {
  // Merge with defaults so a missing field (or an unseeded row) never renders
  // blank. Best-effort: if the fetch fails, fall back entirely to defaults.
  let content = FOOTER_DEFAULT
  try {
    const page = await getContentPage<FooterPageContent>("footer")
    if (page) content = { ...FOOTER_DEFAULT, ...page.fields }
  } catch {
    content = FOOTER_DEFAULT
  }

  // The display phone doubles as the tap-to-call link; strip spaces/dashes so
  // the tel: URI is valid regardless of how the admin formats the number.
  const telHref = `tel:${content.phone.replace(/[^\d+]/g, "")}`

  return (
    <footer className="bg-neutral-950 text-neutral-100 border-t border-neutral-800">

      {/* ── Main grid ── */}
      <div className="px-8 md:px-12 lg:px-20 pt-20 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-14 lg:gap-8 xl:gap-12">

          {/* ─ Col 1: Brand mission ─ */}
          <div>
            <Link
              href="/"
              style={EDITORIAL}
              className="
                block text-[1.45rem] font-light tracking-[0.36em] uppercase
                text-white mb-7 cursor-pointer
                hover:opacity-60 transition-opacity duration-500
              "
            >
              Alloyed Living
            </Link>
            <p
              style={EDITORIAL}
              className="text-[1.05rem] font-light leading-[1.72] tracking-[0.01em]
                         text-neutral-200 max-w-[240px]"
            >
              {content.tagline}
            </p>
          </div>

          {/* ─ Col 2: Navigate ─ */}
          <div>
            <p className="text-[8px] tracking-[0.4em] uppercase text-neutral-300 mb-7">
              Navigate
            </p>
            <ul className="space-y-4">
              {NAV_LINKS.map((link) => (
                <FooterLink key={link.href} {...link} />
              ))}
            </ul>
          </div>

          {/* ─ Col 3: Customer Care ─ */}
          <div>
            <p className="text-[8px] tracking-[0.4em] uppercase text-neutral-300 mb-7">
              Customer Care
            </p>
            <ul className="space-y-4">
              {CARE_LINKS.map((link) => (
                <FooterLink key={link.href} {...link} />
              ))}
            </ul>
          </div>

          {/* ─ Col 4: Contact / Pakistan ─ */}
          <div>
            <p className="text-[8px] tracking-[0.4em] uppercase text-neutral-300 mb-7">
              Pakistan
            </p>
            <div className="space-y-6">

              <div>
                <p className="text-[8px] tracking-[0.24em] uppercase text-neutral-200 mb-2">
                  Helpline
                </p>
                <a
                  href={telHref}
                  className="
                    relative inline-block
                    text-[11px] tracking-[0.14em] text-neutral-100
                    cursor-pointer transition-colors duration-300 hover:text-white
                    after:absolute after:bottom-[-1px] after:left-0
                    after:h-px after:w-0 after:bg-white after:content-['']
                    after:transition-[width] after:duration-300 after:ease-out
                    hover:after:w-full
                  "
                >
                  {content.phone}
                </a>
              </div>

              <div>
                <p className="text-[8px] tracking-[0.24em] uppercase text-neutral-200 mb-2">
                  Email
                </p>
                <a
                  href={`mailto:${content.email}`}
                  className="
                    relative inline-block
                    text-[11px] tracking-[0.14em] text-neutral-100
                    cursor-pointer transition-colors duration-300 hover:text-white
                    after:absolute after:bottom-[-1px] after:left-0
                    after:h-px after:w-0 after:bg-white after:content-['']
                    after:transition-[width] after:duration-300 after:ease-out
                    hover:after:w-full
                  "
                >
                  {content.email}
                </a>
              </div>

              <div>
                <p className="text-[8px] tracking-[0.24em] uppercase text-neutral-200 mb-2">
                  Hours
                </p>
                <p className="text-[11px] tracking-[0.08em] text-neutral-200 leading-relaxed">
                  {content.hours}
                </p>
              </div>

              {/* ─ Social Links ─ */}
              <div>
                <p className="text-[8px] tracking-[0.24em] uppercase text-neutral-200 mb-3">
                  Follow Us
                </p>
                <div className="flex items-center gap-5">
                  <a
                    href={content.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="
                      relative inline-block
                      text-[11px] tracking-[0.14em] text-neutral-100
                      cursor-pointer transition-colors duration-300 hover:text-white
                      after:absolute after:bottom-[-1px] after:left-0
                      after:h-px after:w-0 after:bg-white after:content-['']
                      after:transition-[width] after:duration-300 after:ease-out
                      hover:after:w-full
                    "
                  >
                    Instagram
                  </a>
                  <a
                    href={content.facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="
                      relative inline-block
                      text-[11px] tracking-[0.14em] text-neutral-100
                      cursor-pointer transition-colors duration-300 hover:text-white
                      after:absolute after:bottom-[-1px] after:left-0
                      after:h-px after:w-0 after:bg-white after:content-['']
                      after:transition-[width] after:duration-300 after:ease-out
                      hover:after:w-full
                    "
                  >
                    Facebook
                  </a>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="
        border-t border-neutral-800
        px-8 md:px-12 lg:px-20 py-6
        flex flex-col sm:flex-row items-center justify-between gap-4
      ">
        <p className="text-[8px] tracking-[0.24em] uppercase text-neutral-200">
          {content.copyright}
        </p>
        <div className="flex items-center gap-7">
          <Link
            href="/privacy"
            className="text-[8px] tracking-[0.2em] uppercase text-neutral-200
                       cursor-pointer hover:text-neutral-100 transition-colors duration-300"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="text-[8px] tracking-[0.2em] uppercase text-neutral-200
                       cursor-pointer hover:text-neutral-100 transition-colors duration-300"
          >
            Terms of Use
          </Link>
        </div>
      </div>

    </footer>
  )
}