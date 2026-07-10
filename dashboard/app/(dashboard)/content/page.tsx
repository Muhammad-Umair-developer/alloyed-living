import Link from "next/link"
import { Home, ShoppingBag, Truck, RotateCcw, Mail, Info, HelpCircle, FileText, ArrowRight, MapPin, Download, Sparkles } from "lucide-react"
import { getAllContentPages } from "@/src/lib/data/content"
import PageHeader from "@/src/components/ui/PageHeader"
import type { ContentSlug } from "@/src/lib/data/types"

// Content is edited from this same dashboard — always read fresh.
export const dynamic = "force-dynamic"

const PAGE_META: Record<ContentSlug, { icon: typeof Truck; description: string }> = {
  home: { icon: Home, description: "Hero video/image, story section, shop-the-room banner, and featured products." },
  shop: { icon: ShoppingBag, description: "Collection page heading shown above the product grid." },
  shipping: { icon: Truck, description: "Rates, delivery windows, regions, and free-shipping threshold." },
  returns: { icon: RotateCcw, description: "Return window, process steps, and refund/exchange policies." },
  contact: { icon: Mail, description: "Support email, WhatsApp, and hours shown on the contact page." },
  about: { icon: Info, description: "Brand story shown on the About page." },
  faq: { icon: HelpCircle, description: "General storefront frequently asked questions." },
  terms: { icon: FileText, description: "Terms & conditions copy." },
  "factory-location": { icon: MapPin, description: "Address, map embed, phone, and hours shown on the Factory Location page." },
  catalog: { icon: Download, description: "Hero copy and intro shown above the downloadable product catalog." },
  "custom-order": { icon: Sparkles, description: "Hero copy, motivating intro, and the “how it works” steps shown on the Custom Order page." },
}

export default async function ContentPagesPage() {
  const pages = await getAllContentPages()
  const slugs = Object.keys(pages) as ContentSlug[]

  return (
    <div>
      <PageHeader title="Content Pages" description="Edit the static storefront pages without touching code." />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {slugs.map((slug) => {
          const page = pages[slug]
          const { icon: Icon, description } = PAGE_META[slug]
          return (
            <Link
              key={slug}
              href={`/content/${slug}`}
              className="group flex items-start gap-4 rounded-lg border border-stone-200 bg-white p-5 hover:border-stone-300 hover:shadow-sm transition-all"
            >
              <div className="w-10 h-10 rounded-md bg-[var(--accent-soft)] flex items-center justify-center flex-shrink-0">
                <Icon size={17} strokeWidth={1.75} className="text-[var(--accent)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium text-stone-800">{page.title}</p>
                <p className="text-[12px] text-stone-500 mt-0.5 leading-relaxed">{description}</p>
                <p className="text-[11px] text-stone-600 mt-2">
                  Updated {new Date(page.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
              <ArrowRight size={15} className="text-stone-500 group-hover:text-stone-600 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
