"use client"

import { useId, useState, useTransition, type ChangeEvent } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2, Film, ImageIcon, Ban, ChevronUp, ChevronDown, X, Upload, FileText } from "lucide-react"
import type {
  ContentPage,
  ShippingPageContent,
  ReturnsPageContent,
  ContactPageContent,
  AboutPageContent,
  FaqPageContent,
  TermsPageContent,
  HomePageContent,
  ShopPageContent,
  FactoryLocationPageContent,
  CatalogPageContent,
  CustomOrderPageContent,
  CustomOrderStep,
  FooterPageContent,
  HeroMediaType,
  ShippingTier,
  FAQ,
  ReturnStep,
  ReturnPolicy,
  Product,
} from "@/src/lib/data/types"
import { toast } from "@/src/components/ui/ToastAlert"
import { updateContentPageAction } from "@/src/actions/content-actions"

const inputCls = "w-full px-3 py-2 text-[13px] rounded-md border border-stone-200 bg-white outline-none focus:border-stone-400 transition-colors"

// Paste a link or upload a file (image or video) — either way `onChange`
// receives the final URL/path. Videos preview inline with object-cover so the
// admin sees exactly how the frame will crop on the storefront hero.
function MediaUrlInput({
  value,
  onChange,
  kind,
  placeholder,
}: {
  value: string
  onChange: (url: string) => void
  kind: "image" | "video"
  placeholder?: string
}) {
  const inputId = useId()
  const [uploading, setUploading] = useState(false)
  const accept = kind === "video" ? "video/*" : "image/*"

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    setUploading(true)
    try {
      const body = new FormData()
      body.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Upload failed")
      onChange(data.url)
      toast.success(kind === "video" ? "Video uploaded." : "Image uploaded.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {value ? (
          kind === "video" ? (
            <video
              src={value}
              muted
              playsInline
              className="w-10 h-10 rounded-md object-cover border border-stone-200 flex-shrink-0 bg-stone-100"
            />
          ) : (
            <img src={value} alt="" className="w-10 h-10 rounded-md object-cover border border-stone-200 flex-shrink-0" />
          )
        ) : (
          <div className="w-10 h-10 rounded-md bg-stone-50 border border-dashed border-stone-200 flex-shrink-0" />
        )}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
          placeholder={placeholder}
        />
        <label
          htmlFor={inputId}
          className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium rounded-md border border-stone-200 text-stone-600 hover:bg-stone-50 cursor-pointer transition-colors ${uploading ? "opacity-50 pointer-events-none" : ""}`}
        >
          <Upload size={13} /> {uploading ? "Uploading…" : "Upload"}
        </label>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="p-2 text-stone-600 hover:text-red-600 cursor-pointer flex-shrink-0"
            aria-label={`Remove ${kind}`}
            title={`Remove ${kind}`}
          >
            <X size={15} />
          </button>
        )}
        <input
          id={inputId}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          disabled={uploading}
          className="sr-only"
        />
      </div>

      {/* Full-width preview so the admin sees the object-cover crop */}
      {value && kind === "video" && (
        <video
          src={value}
          autoPlay
          loop
          muted
          playsInline
          className="w-full aspect-video rounded-md object-cover border border-stone-200 bg-stone-100"
        />
      )}
    </div>
  )
}

// Upload a PDF — customers download this exact file from the storefront
// catalog page, so there's no "paste a URL" option here (unlike images/video,
// a stray external PDF link isn't a sensible catalog source).
function PdfUrlInput({
  value,
  onChange,
}: {
  value: string | null
  onChange: (url: string | null) => void
}) {
  const inputId = useId()
  const [uploading, setUploading] = useState(false)

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    setUploading(true)
    try {
      const body = new FormData()
      body.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Upload failed")
      onChange(data.url)
      toast.success("Catalog PDF uploaded.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 flex items-center gap-2.5 px-3 py-2 rounded-md border border-stone-200 bg-white min-w-0">
        <FileText size={14} className="text-stone-500 flex-shrink-0" />
        {value ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] text-stone-700 underline underline-offset-2 truncate"
          >
            {value.split("/").pop()}
          </a>
        ) : (
          <span className="text-[13px] text-stone-500">No PDF uploaded yet</span>
        )}
      </div>
      <label
        htmlFor={inputId}
        className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium rounded-md border border-stone-200 text-stone-600 hover:bg-stone-50 cursor-pointer transition-colors ${uploading ? "opacity-50 pointer-events-none" : ""}`}
      >
        <Upload size={13} /> {uploading ? "Uploading…" : value ? "Replace" : "Upload"}
      </label>
      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="p-2 text-stone-500 hover:text-red-600 cursor-pointer flex-shrink-0"
          aria-label="Remove PDF"
          title="Remove PDF"
        >
          <X size={15} />
        </button>
      )}
      <input
        id={inputId}
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        disabled={uploading}
        className="sr-only"
      />
    </div>
  )
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-stone-700 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-stone-600 mt-1">{hint}</p>}
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-stone-200 bg-white p-6 space-y-6 max-w-3xl">{children}</div>
}

function SaveBar({ pending, onSave }: { pending: boolean; onSave: () => void }) {
  return (
    <div className="flex justify-end mt-6 max-w-3xl">
      <button
        onClick={onSave}
        disabled={pending}
        className="px-5 py-2 text-[13px] font-medium text-white bg-stone-900 rounded-md hover:bg-stone-700 transition-colors disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
      >
        {pending ? "Saving…" : "Save Changes"}
      </button>
    </div>
  )
}

function RepeatableHeader({ title, onAdd }: { title: string; onAdd: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-[11px] font-medium uppercase tracking-wide text-stone-600">{title}</p>
      <button type="button" onClick={onAdd} className="inline-flex items-center gap-1.5 text-[12px] font-medium text-stone-600 hover:text-stone-900 cursor-pointer">
        <Plus size={13} /> Add
      </button>
    </div>
  )
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="p-1.5 text-stone-500 hover:text-red-600 flex-shrink-0 cursor-pointer" aria-label="Remove">
      <Trash2 size={14} />
    </button>
  )
}

// ─── Shipping ─────────────────────────────────────────────────────────────────

function ShippingEditor({ slug, initial }: { slug: "shipping"; initial: ShippingPageContent }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [heroTitle, setHeroTitle] = useState(initial.heroTitle)
  const [heroSubtitle, setHeroSubtitle] = useState(initial.heroSubtitle)
  const [threshold, setThreshold] = useState(initial.freeShippingThreshold.toString())
  const [tiers, setTiers] = useState<ShippingTier[]>(initial.tiers)
  const [faqs, setFaqs] = useState<FAQ[]>(initial.faqs)

  function updateTier(i: number, patch: Partial<ShippingTier>) {
    setTiers((prev) => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)))
  }
  function updateFaq(i: number, patch: Partial<FAQ>) {
    setFaqs((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)))
  }

  function handleSave() {
    startTransition(async () => {
      await updateContentPageAction(slug, {
        heroTitle, heroSubtitle,
        freeShippingThreshold: Number(threshold) || 0,
        tiers, faqs,
      })
      toast.success("Shipping page updated.")
      router.refresh()
    })
  }

  return (
    <div>
      <Card>
        <p className="text-[11px] font-medium uppercase tracking-wide text-stone-600">Hero</p>
        <Field label="Hero Title"><input value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)} className={inputCls} /></Field>
        <Field label="Hero Subtitle"><input value={heroSubtitle} onChange={(e) => setHeroSubtitle(e.target.value)} className={inputCls} /></Field>
        <Field label="Free Shipping Threshold (PKR)"><input type="number" min={0} value={threshold} onChange={(e) => setThreshold(e.target.value)} className={inputCls} /></Field>

        <RepeatableHeader title="Shipping Tiers" onAdd={() => setTiers((p) => [...p, { label: "New Tier", window: "", rate: "", freeMsg: null, carrier: "", note: "" }])} />
        {tiers.map((tier, i) => (
          <div key={i} className="border border-stone-100 rounded-md p-4 space-y-3">
            <div className="flex justify-end"><RemoveButton onClick={() => setTiers((p) => p.filter((_, idx) => idx !== i))} /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Label"><input value={tier.label} onChange={(e) => updateTier(i, { label: e.target.value })} className={inputCls} /></Field>
              <Field label="Rate"><input value={tier.rate} onChange={(e) => updateTier(i, { rate: e.target.value })} className={inputCls} /></Field>
              <Field label="Delivery Window"><input value={tier.window} onChange={(e) => updateTier(i, { window: e.target.value })} className={inputCls} /></Field>
              <Field label="Carrier"><input value={tier.carrier} onChange={(e) => updateTier(i, { carrier: e.target.value })} className={inputCls} /></Field>
            </div>
            <Field label="Free-Shipping Badge (optional)">
              <input value={tier.freeMsg ?? ""} onChange={(e) => updateTier(i, { freeMsg: e.target.value || null })} className={inputCls} />
            </Field>
            <Field label="Note"><textarea value={tier.note} onChange={(e) => updateTier(i, { note: e.target.value })} rows={2} className={`${inputCls} resize-none`} /></Field>
          </div>
        ))}

        <RepeatableHeader title="FAQs" onAdd={() => setFaqs((p) => [...p, { q: "New question", a: "" }])} />
        {faqs.map((faq, i) => (
          <div key={i} className="border border-stone-100 rounded-md p-4 space-y-3">
            <div className="flex justify-end"><RemoveButton onClick={() => setFaqs((p) => p.filter((_, idx) => idx !== i))} /></div>
            <Field label="Question"><input value={faq.q} onChange={(e) => updateFaq(i, { q: e.target.value })} className={inputCls} /></Field>
            <Field label="Answer"><textarea value={faq.a} onChange={(e) => updateFaq(i, { a: e.target.value })} rows={2} className={`${inputCls} resize-none`} /></Field>
          </div>
        ))}
      </Card>
      <SaveBar pending={isPending} onSave={handleSave} />
    </div>
  )
}

// ─── Returns ──────────────────────────────────────────────────────────────────

function ReturnsEditor({ slug, initial }: { slug: "returns"; initial: ReturnsPageContent }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [heroTitle, setHeroTitle] = useState(initial.heroTitle)
  const [heroSubtitle, setHeroSubtitle] = useState(initial.heroSubtitle)
  const [windowDays, setWindowDays] = useState(initial.returnWindowDays.toString())
  const [steps, setSteps] = useState<ReturnStep[]>(initial.steps)
  const [policies, setPolicies] = useState<ReturnPolicy[]>(initial.policies)

  function updateStep(i: number, patch: Partial<ReturnStep>) {
    setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)))
  }
  function updatePolicy(i: number, patch: Partial<ReturnPolicy>) {
    setPolicies((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)))
  }

  function handleSave() {
    startTransition(async () => {
      await updateContentPageAction(slug, {
        heroTitle, heroSubtitle,
        returnWindowDays: Number(windowDays) || 0,
        steps, policies,
      })
      toast.success("Returns page updated.")
      router.refresh()
    })
  }

  return (
    <div>
      <Card>
        <p className="text-[11px] font-medium uppercase tracking-wide text-stone-600">Hero</p>
        <Field label="Hero Title"><input value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)} className={inputCls} /></Field>
        <Field label="Hero Subtitle"><input value={heroSubtitle} onChange={(e) => setHeroSubtitle(e.target.value)} className={inputCls} /></Field>
        <Field label="Return Window (days)"><input type="number" min={0} value={windowDays} onChange={(e) => setWindowDays(e.target.value)} className={inputCls} /></Field>

        <RepeatableHeader title="Process Steps" onAdd={() => setSteps((p) => [...p, { n: String(p.length + 1).padStart(2, "0"), label: "New Step", desc: "" }])} />
        {steps.map((step, i) => (
          <div key={i} className="border border-stone-100 rounded-md p-4 space-y-3">
            <div className="flex justify-end"><RemoveButton onClick={() => setSteps((p) => p.filter((_, idx) => idx !== i))} /></div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Number"><input value={step.n} onChange={(e) => updateStep(i, { n: e.target.value })} className={inputCls} /></Field>
              <div className="col-span-2">
                <Field label="Label"><input value={step.label} onChange={(e) => updateStep(i, { label: e.target.value })} className={inputCls} /></Field>
              </div>
            </div>
            <Field label="Description"><textarea value={step.desc} onChange={(e) => updateStep(i, { desc: e.target.value })} rows={2} className={`${inputCls} resize-none`} /></Field>
          </div>
        ))}

        <RepeatableHeader
          title="Return Policies"
          onAdd={() => setPolicies((p) => [...p, { id: `policy-${p.length + 1}`, label: "New Policy", badge: null, conditions: [], note: "" }])}
        />
        {policies.map((policy, i) => (
          <div key={i} className="border border-stone-100 rounded-md p-4 space-y-3">
            <div className="flex justify-end"><RemoveButton onClick={() => setPolicies((p) => p.filter((_, idx) => idx !== i))} /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Label"><input value={policy.label} onChange={(e) => updatePolicy(i, { label: e.target.value })} className={inputCls} /></Field>
              <Field label="Badge (optional)"><input value={policy.badge ?? ""} onChange={(e) => updatePolicy(i, { badge: e.target.value || null })} className={inputCls} /></Field>
            </div>
            <Field label="Conditions" >
              <textarea
                value={policy.conditions.join("\n")}
                onChange={(e) => updatePolicy(i, { conditions: e.target.value.split("\n").map((c) => c.trim()).filter(Boolean) })}
                rows={4}
                className={`${inputCls} resize-none`}
                placeholder="One condition per line"
              />
            </Field>
            <Field label="Note"><textarea value={policy.note} onChange={(e) => updatePolicy(i, { note: e.target.value })} rows={2} className={`${inputCls} resize-none`} /></Field>
          </div>
        ))}
      </Card>
      <SaveBar pending={isPending} onSave={handleSave} />
    </div>
  )
}

// ─── Contact ──────────────────────────────────────────────────────────────────

function ContactEditor({ slug, initial }: { slug: "contact"; initial: ContactPageContent }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [fields, setFields] = useState(initial)

  function handleSave() {
    startTransition(async () => {
      await updateContentPageAction(slug, fields)
      toast.success("Contact page updated.")
      router.refresh()
    })
  }

  return (
    <div>
      <Card>
        <Field label="Hero Title"><input value={fields.heroTitle} onChange={(e) => setFields((f) => ({ ...f, heroTitle: e.target.value }))} className={inputCls} /></Field>
        <Field label="Hero Subtitle"><textarea value={fields.heroSubtitle} onChange={(e) => setFields((f) => ({ ...f, heroSubtitle: e.target.value }))} rows={2} className={`${inputCls} resize-none`} /></Field>
        <Field label="Support Email"><input value={fields.email} onChange={(e) => setFields((f) => ({ ...f, email: e.target.value }))} className={inputCls} /></Field>
        <Field label="WhatsApp Link"><input value={fields.whatsapp} onChange={(e) => setFields((f) => ({ ...f, whatsapp: e.target.value }))} className={inputCls} /></Field>
        <Field label="Support Hours"><input value={fields.hours} onChange={(e) => setFields((f) => ({ ...f, hours: e.target.value }))} className={inputCls} /></Field>
      </Card>
      <SaveBar pending={isPending} onSave={handleSave} />
    </div>
  )
}

// ─── About ────────────────────────────────────────────────────────────────────

function AboutEditor({ slug, initial }: { slug: "about"; initial: AboutPageContent }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [fields, setFields] = useState(initial)

  function handleSave() {
    startTransition(async () => {
      await updateContentPageAction(slug, fields)
      toast.success("About page updated.")
      router.refresh()
    })
  }

  return (
    <div>
      <Card>
        <Field label="Hero Title"><input value={fields.heroTitle} onChange={(e) => setFields((f) => ({ ...f, heroTitle: e.target.value }))} className={inputCls} /></Field>
        <Field label="Body Copy"><textarea value={fields.body} onChange={(e) => setFields((f) => ({ ...f, body: e.target.value }))} rows={6} className={`${inputCls} resize-none`} /></Field>
      </Card>
      <SaveBar pending={isPending} onSave={handleSave} />
    </div>
  )
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────

function FaqEditor({ slug, initial }: { slug: "faq"; initial: FaqPageContent }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [faqs, setFaqs] = useState<FAQ[]>(initial.faqs)

  function updateFaq(i: number, patch: Partial<FAQ>) {
    setFaqs((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)))
  }

  function handleSave() {
    startTransition(async () => {
      await updateContentPageAction(slug, { faqs })
      toast.success("FAQ page updated.")
      router.refresh()
    })
  }

  return (
    <div>
      <Card>
        <RepeatableHeader title="Questions" onAdd={() => setFaqs((p) => [...p, { q: "New question", a: "" }])} />
        {faqs.map((faq, i) => (
          <div key={i} className="border border-stone-100 rounded-md p-4 space-y-3">
            <div className="flex justify-end"><RemoveButton onClick={() => setFaqs((p) => p.filter((_, idx) => idx !== i))} /></div>
            <Field label="Question"><input value={faq.q} onChange={(e) => updateFaq(i, { q: e.target.value })} className={inputCls} /></Field>
            <Field label="Answer"><textarea value={faq.a} onChange={(e) => updateFaq(i, { a: e.target.value })} rows={2} className={`${inputCls} resize-none`} /></Field>
          </div>
        ))}
      </Card>
      <SaveBar pending={isPending} onSave={handleSave} />
    </div>
  )
}

// ─── Terms ────────────────────────────────────────────────────────────────────

function TermsEditor({ slug, initial }: { slug: "terms"; initial: TermsPageContent }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [body, setBody] = useState(initial.body)

  function handleSave() {
    startTransition(async () => {
      await updateContentPageAction(slug, { body })
      toast.success("Terms page updated.")
      router.refresh()
    })
  }

  return (
    <div>
      <Card>
        <Field label="Body Copy"><textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} className={`${inputCls} resize-none`} /></Field>
      </Card>
      <SaveBar pending={isPending} onSave={handleSave} />
    </div>
  )
}

// ─── Home ─────────────────────────────────────────────────────────────────────

const MEDIA_TYPE_OPTIONS: { value: HeroMediaType; label: string; icon: typeof Film }[] = [
  { value: "video", label: "Video", icon: Film },
  { value: "image", label: "Image", icon: ImageIcon },
  { value: "none", label: "None", icon: Ban },
]

function HomeEditor({ slug, initial, products }: { slug: "home"; initial: HomePageContent; products: Product[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [hero, setHero] = useState(initial.hero)
  const [story, setStory] = useState(initial.story)
  const [shopRoom, setShopRoom] = useState(initial.shopRoom)
  const [featured, setFeatured] = useState(initial.featured)

  function toggleFeaturedProduct(id: string) {
    setFeatured((f) => ({
      ...f,
      productIds: f.productIds.includes(id)
        ? f.productIds.filter((x) => x !== id)
        : [...f.productIds, id],
    }))
  }

  function moveFeaturedProduct(index: number, dir: -1 | 1) {
    setFeatured((f) => {
      const next = [...f.productIds]
      const target = index + dir
      if (target < 0 || target >= next.length) return f
      ;[next[index], next[target]] = [next[target], next[index]]
      return { ...f, productIds: next }
    })
  }

  function handleSave() {
    startTransition(async () => {
      await updateContentPageAction(slug, { hero, story, shopRoom, featured })
      toast.success("Home page updated.")
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card>
        <p className="text-[11px] font-medium uppercase tracking-wide text-stone-600">Hero Media</p>

        <div className="flex gap-2">
          {MEDIA_TYPE_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setHero((h) => ({ ...h, mediaType: value }))}
              className={`flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium rounded-md border transition-colors cursor-pointer ${
                hero.mediaType === value
                  ? "bg-stone-900 text-white border-stone-900"
                  : "text-stone-600 border-stone-200 hover:bg-stone-50"
              }`}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>

        {hero.mediaType === "video" && (
          <Field label="Hero Video" hint="Upload an MP4/WebM (up to 100MB) or paste a path under /public (e.g. /video1.mp4). Displayed full-bleed with object-fit: cover.">
            <MediaUrlInput
              kind="video"
              value={hero.videoUrl ?? ""}
              onChange={(url) => setHero((h) => ({ ...h, videoUrl: url || null }))}
              placeholder="/video1.mp4 or https://…"
            />
          </Field>
        )}

        {hero.mediaType === "image" && (
          <Field label="Hero Image" hint="Upload a file (up to 8MB) or paste a path under /public or a full URL.">
            <MediaUrlInput
              kind="image"
              value={hero.imageUrl ?? ""}
              onChange={(url) => setHero((h) => ({ ...h, imageUrl: url || null }))}
              placeholder="/8.jpg.jpeg or https://…"
            />
          </Field>
        )}

        {hero.mediaType === "none" && (
          <p className="text-[12px] text-stone-600">No background media — the hero will show a plain dark backdrop.</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Eyebrow"><input value={hero.eyebrow} onChange={(e) => setHero((h) => ({ ...h, eyebrow: e.target.value }))} className={inputCls} /></Field>
          <Field label="CTA Label"><input value={hero.ctaLabel} onChange={(e) => setHero((h) => ({ ...h, ctaLabel: e.target.value }))} className={inputCls} /></Field>
          <Field label="Title — Line 1"><input value={hero.titleLine1} onChange={(e) => setHero((h) => ({ ...h, titleLine1: e.target.value }))} className={inputCls} /></Field>
          <Field label="Title — Line 2"><input value={hero.titleLine2} onChange={(e) => setHero((h) => ({ ...h, titleLine2: e.target.value }))} className={inputCls} /></Field>
        </div>
        <Field label="Tagline"><input value={hero.tagline} onChange={(e) => setHero((h) => ({ ...h, tagline: e.target.value }))} className={inputCls} /></Field>
      </Card>

      {/* Story */}
      <Card>
        <p className="text-[11px] font-medium uppercase tracking-wide text-stone-600">Story Section</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Eyebrow"><input value={story.eyebrow} onChange={(e) => setStory((s) => ({ ...s, eyebrow: e.target.value }))} className={inputCls} /></Field>
          <Field label="CTA Label"><input value={story.ctaLabel} onChange={(e) => setStory((s) => ({ ...s, ctaLabel: e.target.value }))} className={inputCls} /></Field>
        </div>
        <Field label="Title"><input value={story.title} onChange={(e) => setStory((s) => ({ ...s, title: e.target.value }))} className={inputCls} /></Field>
        <Field label="Body"><textarea value={story.body} onChange={(e) => setStory((s) => ({ ...s, body: e.target.value }))} rows={3} className={`${inputCls} resize-none`} /></Field>
      </Card>

      {/* Shop the Room */}
      <Card>
        <p className="text-[11px] font-medium uppercase tracking-wide text-stone-600">Shop-the-Room Banner</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Eyebrow"><input value={shopRoom.eyebrow} onChange={(e) => setShopRoom((s) => ({ ...s, eyebrow: e.target.value }))} className={inputCls} /></Field>
          <Field label="CTA Label"><input value={shopRoom.ctaLabel} onChange={(e) => setShopRoom((s) => ({ ...s, ctaLabel: e.target.value }))} className={inputCls} /></Field>
        </div>
        <Field label="Title"><input value={shopRoom.title} onChange={(e) => setShopRoom((s) => ({ ...s, title: e.target.value }))} className={inputCls} /></Field>
        <Field label="Subtitle"><textarea value={shopRoom.subtitle} onChange={(e) => setShopRoom((s) => ({ ...s, subtitle: e.target.value }))} rows={2} className={`${inputCls} resize-none`} /></Field>
        <Field label="Background Image" hint="Upload a file or paste a path/URL.">
          <MediaUrlInput
            kind="image"
            value={shopRoom.backgroundImage}
            onChange={(url) => setShopRoom((s) => ({ ...s, backgroundImage: url }))}
            placeholder="/room.jpg or https://…"
          />
        </Field>
      </Card>

      {/* Featured products */}
      <Card>
        <p className="text-[11px] font-medium uppercase tracking-wide text-stone-600">Featured Pieces</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Eyebrow"><input value={featured.eyebrow} onChange={(e) => setFeatured((f) => ({ ...f, eyebrow: e.target.value }))} className={inputCls} /></Field>
          <Field label="CTA Label"><input value={featured.ctaLabel} onChange={(e) => setFeatured((f) => ({ ...f, ctaLabel: e.target.value }))} className={inputCls} /></Field>
        </div>
        <Field label="Title"><input value={featured.title} onChange={(e) => setFeatured((f) => ({ ...f, title: e.target.value }))} className={inputCls} /></Field>

        <Field label="Selected Products" hint="Order controls left-to-right position on the home page">
          <div className="space-y-1.5 mb-3">
            {featured.productIds.map((id, i) => {
              const product = products.find((p) => p.id === id)
              return (
                <div key={id} className="flex items-center gap-2 px-3 py-2 rounded-md bg-stone-50 border border-stone-100">
                  <span className="text-[13px] text-stone-700 flex-1 truncate">{product?.name ?? id}</span>
                  <button type="button" onClick={() => moveFeaturedProduct(i, -1)} disabled={i === 0} className="p-1 text-stone-600 hover:text-stone-700 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed">
                    <ChevronUp size={14} />
                  </button>
                  <button type="button" onClick={() => moveFeaturedProduct(i, 1)} disabled={i === featured.productIds.length - 1} className="p-1 text-stone-600 hover:text-stone-700 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed">
                    <ChevronDown size={14} />
                  </button>
                  <button type="button" onClick={() => toggleFeaturedProduct(id)} className="p-1 text-stone-600 hover:text-red-600 cursor-pointer">
                    <X size={14} />
                  </button>
                </div>
              )
            })}
            {featured.productIds.length === 0 && (
              <p className="text-[12px] text-stone-600">No products selected yet — add some below.</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {products
              .filter((p) => !featured.productIds.includes(p.id))
              .map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleFeaturedProduct(p.id)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] rounded-md border border-stone-200 text-stone-600 hover:border-stone-400 hover:text-stone-900 cursor-pointer"
                >
                  <Plus size={12} /> {p.name}
                </button>
              ))}
          </div>
        </Field>
      </Card>

      <SaveBar pending={isPending} onSave={handleSave} />
    </div>
  )
}

// ─── Shop ─────────────────────────────────────────────────────────────────────

function ShopEditor({ slug, initial }: { slug: "shop"; initial: ShopPageContent }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [fields, setFields] = useState(initial)

  function handleSave() {
    startTransition(async () => {
      await updateContentPageAction(slug, fields)
      toast.success("Shop page updated.")
      router.refresh()
    })
  }

  return (
    <div>
      <Card>
        <Field label="Eyebrow"><input value={fields.eyebrow} onChange={(e) => setFields((f) => ({ ...f, eyebrow: e.target.value }))} className={inputCls} /></Field>
        <Field label="Title"><input value={fields.title} onChange={(e) => setFields((f) => ({ ...f, title: e.target.value }))} className={inputCls} /></Field>
      </Card>
      <SaveBar pending={isPending} onSave={handleSave} />
    </div>
  )
}

// ─── Factory Location ─────────────────────────────────────────────────────────

function FactoryLocationEditor({ slug, initial }: { slug: "factory-location"; initial: FactoryLocationPageContent }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [fields, setFields] = useState(initial)

  function handleSave() {
    startTransition(async () => {
      await updateContentPageAction(slug, fields)
      toast.success("Factory Location page updated.")
      router.refresh()
    })
  }

  return (
    <div>
      <Card>
        <Field label="Hero Title"><input value={fields.heroTitle} onChange={(e) => setFields((f) => ({ ...f, heroTitle: e.target.value }))} className={inputCls} /></Field>
        <Field label="Hero Subtitle"><textarea value={fields.heroSubtitle} onChange={(e) => setFields((f) => ({ ...f, heroSubtitle: e.target.value }))} rows={2} className={`${inputCls} resize-none`} /></Field>
        <Field label="Address"><textarea value={fields.address} onChange={(e) => setFields((f) => ({ ...f, address: e.target.value }))} rows={2} className={`${inputCls} resize-none`} /></Field>
        <Field
          label="Google Maps Embed URL"
          hint="Paste a Google Maps embed link (Share → Embed a map), or a maps.google.com/?output=embed URL."
        >
          <input value={fields.mapEmbedUrl} onChange={(e) => setFields((f) => ({ ...f, mapEmbedUrl: e.target.value }))} className={inputCls} />
        </Field>
        <Field label="Phone"><input value={fields.phone} onChange={(e) => setFields((f) => ({ ...f, phone: e.target.value }))} className={inputCls} /></Field>
        <Field label="Hours"><input value={fields.hours} onChange={(e) => setFields((f) => ({ ...f, hours: e.target.value }))} className={inputCls} /></Field>
      </Card>
      <SaveBar pending={isPending} onSave={handleSave} />
    </div>
  )
}

// ─── Catalog ──────────────────────────────────────────────────────────────────

function CatalogEditor({ slug, initial }: { slug: "catalog"; initial: CatalogPageContent }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [fields, setFields] = useState(initial)

  function handleSave() {
    startTransition(async () => {
      await updateContentPageAction(slug, fields)
      toast.success("Catalog page updated.")
      router.refresh()
    })
  }

  return (
    <div>
      <Card>
        <Field label="Hero Title"><input value={fields.heroTitle} onChange={(e) => setFields((f) => ({ ...f, heroTitle: e.target.value }))} className={inputCls} /></Field>
        <Field label="Hero Subtitle"><textarea value={fields.heroSubtitle} onChange={(e) => setFields((f) => ({ ...f, heroSubtitle: e.target.value }))} rows={2} className={`${inputCls} resize-none`} /></Field>
        <Field label="Intro Copy"><textarea value={fields.intro} onChange={(e) => setFields((f) => ({ ...f, intro: e.target.value }))} rows={4} className={`${inputCls} resize-none`} /></Field>
        <Field
          label="Catalog PDF"
          hint="Customers download this exact file from the Download Full Catalog button. Without one, the storefront falls back to an auto-generated PDF."
        >
          <PdfUrlInput
            value={fields.catalogPdfUrl}
            onChange={(url) => setFields((f) => ({ ...f, catalogPdfUrl: url }))}
          />
        </Field>
      </Card>
      <SaveBar pending={isPending} onSave={handleSave} />
    </div>
  )
}

// ─── Custom Order ─────────────────────────────────────────────────────────────

// Built-in gallery used when a saved row predates the galleryItems field, so the
// editor always has cards to show. Mirrors the storefront/content defaults.
const CUSTOM_ORDER_GALLERY_FALLBACK: NonNullable<CustomOrderPageContent["galleryItems"]> = [
  { imageUrl: "/2.jpg.jpeg", caption: "Bespoke Dimensions" },
  { imageUrl: "/6.jpg.jpeg", caption: "Custom Finishes" },
  { imageUrl: "/9.jpg.jpeg", caption: "Industrial Craftsmanship" },
]

function CustomOrderEditor({ slug, initial }: { slug: "custom-order"; initial: CustomOrderPageContent }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  // Normalise galleryItems so rows saved before this field existed still edit cleanly.
  const [fields, setFields] = useState<CustomOrderPageContent>({
    ...initial,
    galleryItems: initial.galleryItems?.length ? initial.galleryItems : CUSTOM_ORDER_GALLERY_FALLBACK,
  })

  const galleryItems = fields.galleryItems ?? []

  function updateStep(i: number, patch: Partial<CustomOrderStep>) {
    setFields((f) => ({ ...f, steps: f.steps.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) }))
  }

  function updateGalleryItem(i: number, patch: Partial<{ imageUrl: string; caption: string }>) {
    setFields((f) => ({
      ...f,
      galleryItems: (f.galleryItems ?? []).map((g, idx) => (idx === i ? { ...g, ...patch } : g)),
    }))
  }

  function handleSave() {
    startTransition(async () => {
      await updateContentPageAction(slug, fields)
      toast.success("Custom Order page updated.")
      router.refresh()
    })
  }

  return (
    <div>
      <Card>
        <p className="text-[11px] font-medium uppercase tracking-wide text-stone-600">Hero</p>
        <Field
          label="Hero Background Image"
          hint="Upload a file (up to 8MB) or paste a path under /public or a full URL. Sits behind the hero with a dark overlay; leave empty to use the built-in default."
        >
          <MediaUrlInput
            kind="image"
            value={fields.heroImage ?? ""}
            onChange={(url) => setFields((f) => ({ ...f, heroImage: url || undefined }))}
            placeholder="/img.png or https://…"
          />
        </Field>
        <Field label="Eyebrow"><input value={fields.eyebrow} onChange={(e) => setFields((f) => ({ ...f, eyebrow: e.target.value }))} className={inputCls} /></Field>
        <Field label="Hero Title"><input value={fields.heroTitle} onChange={(e) => setFields((f) => ({ ...f, heroTitle: e.target.value }))} className={inputCls} /></Field>
        <Field label="Hero Subtitle" hint="The motivating line under the title.">
          <textarea value={fields.heroSubtitle} onChange={(e) => setFields((f) => ({ ...f, heroSubtitle: e.target.value }))} rows={3} className={`${inputCls} resize-none`} />
        </Field>

        <RepeatableHeader
          title="How It Works — Steps"
          onAdd={() => setFields((f) => ({ ...f, steps: [...f.steps, { title: "New Step", description: "" }] }))}
        />
        {fields.steps.map((step, i) => (
          <div key={i} className="border border-stone-100 rounded-md p-4 space-y-3">
            <div className="flex justify-end">
              <RemoveButton onClick={() => setFields((f) => ({ ...f, steps: f.steps.filter((_, idx) => idx !== i) }))} />
            </div>
            <Field label="Step Title"><input value={step.title} onChange={(e) => updateStep(i, { title: e.target.value })} className={inputCls} /></Field>
            <Field label="Step Description"><textarea value={step.description} onChange={(e) => updateStep(i, { description: e.target.value })} rows={2} className={`${inputCls} resize-none`} /></Field>
          </div>
        ))}

        <div className="border-t border-stone-100 pt-6 space-y-6">
          <RepeatableHeader
            title="Inspiration Gallery Items"
            onAdd={() => setFields((f) => ({ ...f, galleryItems: [...(f.galleryItems ?? []), { imageUrl: "", caption: "New Caption" }] }))}
          />
          {galleryItems.map((item, i) => (
            <div key={i} className="border border-stone-100 rounded-md p-4 space-y-3">
              <div className="flex justify-end">
                <RemoveButton onClick={() => setFields((f) => ({ ...f, galleryItems: (f.galleryItems ?? []).filter((_, idx) => idx !== i) }))} />
              </div>
              <Field label="Image" hint="Upload a file (up to 8MB) or paste a path under /public or a full URL.">
                <MediaUrlInput
                  kind="image"
                  value={item.imageUrl}
                  onChange={(url) => updateGalleryItem(i, { imageUrl: url })}
                  placeholder="/2.jpg.jpeg or https://…"
                />
              </Field>
              <Field label="Caption"><input value={item.caption} onChange={(e) => updateGalleryItem(i, { caption: e.target.value })} className={inputCls} /></Field>
            </div>
          ))}
        </div>

        <div className="border-t border-stone-100 pt-6 space-y-6">
          <p className="text-[11px] font-medium uppercase tracking-wide text-stone-600">Form Section</p>
          <Field label="Form Heading"><input value={fields.formHeading} onChange={(e) => setFields((f) => ({ ...f, formHeading: e.target.value }))} className={inputCls} /></Field>
          <Field label="Form Subheading"><input value={fields.formSubheading} onChange={(e) => setFields((f) => ({ ...f, formSubheading: e.target.value }))} className={inputCls} /></Field>
        </div>
      </Card>
      <SaveBar pending={isPending} onSave={handleSave} />
    </div>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function FooterEditor({ slug, initial }: { slug: "footer"; initial: FooterPageContent }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [fields, setFields] = useState(initial)

  function handleSave() {
    startTransition(async () => {
      await updateContentPageAction(slug, fields)
      toast.success("Footer updated.")
      router.refresh()
    })
  }

  return (
    <div>
      <Card>
        <p className="text-[11px] font-medium uppercase tracking-wide text-stone-600">Brand</p>
        <Field label="Tagline" hint="The short line under the brand name in the footer.">
          <textarea value={fields.tagline} onChange={(e) => setFields((f) => ({ ...f, tagline: e.target.value }))} rows={2} className={`${inputCls} resize-none`} />
        </Field>

        <div className="border-t border-stone-100 pt-6 space-y-6">
          <p className="text-[11px] font-medium uppercase tracking-wide text-stone-600">Contact</p>
          <Field label="Helpline Phone" hint="Shown as the helpline number; also becomes the tap-to-call link.">
            <input value={fields.phone} onChange={(e) => setFields((f) => ({ ...f, phone: e.target.value }))} className={inputCls} placeholder="+92 51 123 4567" />
          </Field>
          <Field label="Email" hint="Shown in the footer; also becomes the mailto link.">
            <input value={fields.email} onChange={(e) => setFields((f) => ({ ...f, email: e.target.value }))} className={inputCls} placeholder="hello@alloyedliving.com" />
          </Field>
          <Field label="Hours">
            <input value={fields.hours} onChange={(e) => setFields((f) => ({ ...f, hours: e.target.value }))} className={inputCls} placeholder="Mon – Sat, 10 am – 7 pm PKT" />
          </Field>
        </div>

        <div className="border-t border-stone-100 pt-6 space-y-6">
          <p className="text-[11px] font-medium uppercase tracking-wide text-stone-600">Social Links</p>
          <Field label="Instagram URL" hint="Full link, e.g. https://www.instagram.com/yourhandle">
            <input value={fields.instagramUrl} onChange={(e) => setFields((f) => ({ ...f, instagramUrl: e.target.value }))} className={inputCls} placeholder="https://www.instagram.com/…" />
          </Field>
          <Field label="Facebook URL" hint="Full link, e.g. https://www.facebook.com/yourpage">
            <input value={fields.facebookUrl} onChange={(e) => setFields((f) => ({ ...f, facebookUrl: e.target.value }))} className={inputCls} placeholder="https://www.facebook.com/…" />
          </Field>
        </div>

        <div className="border-t border-stone-100 pt-6 space-y-6">
          <p className="text-[11px] font-medium uppercase tracking-wide text-stone-600">Bottom Bar</p>
          <Field label="Copyright">
            <input value={fields.copyright} onChange={(e) => setFields((f) => ({ ...f, copyright: e.target.value }))} className={inputCls} placeholder="© 2026 Alloyed Living. All rights reserved." />
          </Field>
        </div>
      </Card>
      <SaveBar pending={isPending} onSave={handleSave} />
    </div>
  )
}

// ─── Root switch ──────────────────────────────────────────────────────────────

export default function ContentPageEditor({ page, products }: { page: ContentPage; products: Product[] }) {
  switch (page.slug) {
    case "home":
      return <HomeEditor slug="home" initial={page.fields as HomePageContent} products={products} />
    case "shop":
      return <ShopEditor slug="shop" initial={page.fields as ShopPageContent} />
    case "shipping":
      return <ShippingEditor slug="shipping" initial={page.fields as ShippingPageContent} />
    case "returns":
      return <ReturnsEditor slug="returns" initial={page.fields as ReturnsPageContent} />
    case "contact":
      return <ContactEditor slug="contact" initial={page.fields as ContactPageContent} />
    case "about":
      return <AboutEditor slug="about" initial={page.fields as AboutPageContent} />
    case "faq":
      return <FaqEditor slug="faq" initial={page.fields as FaqPageContent} />
    case "terms":
      return <TermsEditor slug="terms" initial={page.fields as TermsPageContent} />
    case "factory-location":
      return <FactoryLocationEditor slug="factory-location" initial={page.fields as FactoryLocationPageContent} />
    case "catalog":
      return <CatalogEditor slug="catalog" initial={page.fields as CatalogPageContent} />
    case "custom-order":
      return <CustomOrderEditor slug="custom-order" initial={page.fields as CustomOrderPageContent} />
    case "footer":
      return <FooterEditor slug="footer" initial={page.fields as FooterPageContent} />
  }
}
