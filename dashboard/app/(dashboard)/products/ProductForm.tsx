"use client"

import { useId, useState, useTransition, type ChangeEvent } from "react"
import { useRouter } from "next/navigation"
import { Plus, X, ArrowLeft, Upload, Eye, Trash2, Pencil } from "lucide-react"
import Link from "next/link"
import type { Product, ProductInput } from "@/src/lib/data/types"
import { toast } from "@/src/components/ui/ToastAlert"
import RichTextEditor from "@/src/components/ui/RichTextEditor"
import ConfirmDialog from "@/src/components/ui/ConfirmDialog"
import {
  createProductAction,
  updateProductAction,
  renameCategoryAction,
  deleteCategoryAction,
} from "@/src/actions/product-actions"

// Largest image the upload route accepts (mirrors MAX_IMAGE_BYTES in
// app/api/upload/route.ts) — checked client-side so an oversized file is caught
// with a clear message instead of failing mid-request.
const MAX_IMAGE_BYTES = 8 * 1024 * 1024

interface ProductFormProps {
  product?: Product
  categories?: string[]
}

// Evokes the storefront's editorial serif inside the dashboard preview without
// pulling in the site's font — a plain serif fallback reads close enough.
const PREVIEW_SERIF: React.CSSProperties = {
  fontFamily: "Georgia, 'Cormorant Garamond', 'Times New Roman', serif",
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

// Section heading with a "where it appears on the site" tag so admins can see
// at a glance which part of the storefront each group of fields feeds.
function SectionHeader({ title, where }: { title: string; where?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <p className="text-[11px] font-medium uppercase tracking-wide text-stone-600">{title}</p>
      {where && (
        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--accent)]">
          <Eye size={10} /> {where}
        </span>
      )}
    </div>
  )
}

const inputCls = "w-full px-3 py-2 text-[13px] rounded-md border border-stone-200 bg-white outline-none focus:border-stone-400 transition-colors"

// Paste a link or upload a file — either way `onChange` receives the final image URL/path.
function ImageUrlInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (url: string) => void
  placeholder?: string
}) {
  const inputId = useId()
  const [uploading, setUploading] = useState(false)

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    // Catch oversized images up front. Without this, a too-large file trips the
    // server's request-size limit, which returns a non-JSON body — parsing it
    // used to surface as a cryptic "unexpected token R" console error instead of
    // telling the admin what actually went wrong.
    if (file.type.startsWith("image/") && file.size > MAX_IMAGE_BYTES) {
      toast.error("Image too large — please use an image under 8MB.")
      return
    }

    setUploading(true)
    try {
      const body = new FormData()
      body.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body })

      // The response may not be JSON (e.g. a request-too-large error page), so
      // parse defensively and treat a size failure as "Image too large".
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        if (res.status === 413) throw new Error("Image too large — please use an image under 8MB.")
        throw new Error(data?.error ?? "Upload failed.")
      }
      onChange(data.url)
      toast.success("Image uploaded.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {value ? (
        <img src={value} alt="" className="w-10 h-10 rounded-md object-cover border border-stone-200 flex-shrink-0" />
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
      <input
        id={inputId}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={uploading}
        className="sr-only"
      />
    </div>
  )
}

// ─── Live storefront preview ──────────────────────────────────────────────────
// Mirrors the two places customers actually see this content: the quick-view
// popup (short description) and the product detail page (highlights + full
// description). Updates as the admin types.

interface PreviewProps {
  image: string
  name: string
  material: string
  category: string
  description: string
  price: string
  discountPrice: string
  features: string[]
  longDescription: string
}

function fmtPKR(price: string): string {
  const n = Number(price)
  return Number.isFinite(n) && n > 0 ? `PKR ${n.toLocaleString()}` : "PKR —"
}

// A discount only counts when it's a real, positive number — a blank or 0 means
// "no discount" (and must never blank out / zero the real price).
function activeDiscount(discountPrice: string): number | null {
  const n = Number(discountPrice)
  return discountPrice.trim() && Number.isFinite(n) && n > 0 ? n : null
}

function looksLikeHtml(s: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(s)
}

function LivePreview(p: PreviewProps) {
  const name = p.name.trim() || "Product name"
  const cleanFeatures = p.features.map((f) => f.trim()).filter(Boolean)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-stone-600">
        <Eye size={12} /> Live preview
      </div>

      {/* Quick-view popup mock */}
      <div className="rounded-lg border border-stone-200 bg-white overflow-hidden">
        <div className="border-b border-stone-100 px-3 py-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-stone-600">
            Quick view popup
          </p>
        </div>
        <div className="flex gap-3 p-3">
          <div className="w-20 flex-shrink-0 aspect-[4/5] overflow-hidden rounded-md bg-stone-100">
            {p.image ? (
              <img src={p.image} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full grid place-items-center text-[9px] text-stone-500">
                No image
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            {p.category.trim() && (
              <p className="text-[8px] tracking-[0.24em] uppercase text-stone-500">{p.category}</p>
            )}
            <p style={PREVIEW_SERIF} className="text-[15px] leading-snug text-stone-900 mt-0.5">
              {name}
            </p>
            {p.material.trim() && (
              <p className="text-[8px] tracking-[0.2em] uppercase text-stone-500 mt-1">{p.material}</p>
            )}
            <p className="text-[11px] text-stone-600 leading-relaxed mt-1.5 line-clamp-2">
              {p.description.trim() || "Short description shown here — keep it to about two lines."}
            </p>
            <p className="text-[12px] font-semibold text-stone-900 mt-1.5">{fmtPKR(p.price)}</p>
          </div>
        </div>
        <div className="px-3 pb-3 space-y-1.5">
          <div className="w-full py-1.5 bg-stone-900 text-white text-center text-[8px] tracking-[0.3em] uppercase rounded-sm">
            Add to Cart
          </div>
          <div className="w-full py-1.5 border border-stone-900 text-stone-900 text-center text-[8px] tracking-[0.3em] uppercase rounded-sm">
            View Full Details
          </div>
        </div>
      </div>

      {/* Detail page mock */}
      <div className="rounded-lg border border-stone-200 bg-white overflow-hidden">
        <div className="border-b border-stone-100 px-3 py-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-stone-600">
            Product detail page
          </p>
        </div>
        <div className="p-3 space-y-3">
          <div>
            <p style={PREVIEW_SERIF} className="text-[17px] leading-tight text-stone-900">
              {name}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-amber-500 text-[11px]">★★★★★</span>
              <span className="text-[9px] text-stone-600">rating summary</span>
            </div>
            <p className="text-[13px] font-semibold text-stone-900 mt-1">
              {activeDiscount(p.discountPrice) !== null ? (
                <>
                  <span className="line-through font-normal text-stone-500 mr-1.5">{fmtPKR(p.price)}</span>
                  {fmtPKR(p.discountPrice)}
                </>
              ) : (
                fmtPKR(p.price)
              )}
            </p>
          </div>

          {/* Highlights */}
          <div>
            <p className="text-[9px] tracking-[0.2em] uppercase text-stone-600 mb-1.5">Highlights</p>
            {cleanFeatures.length > 0 ? (
              <ul className="space-y-1">
                {cleanFeatures.map((f, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[11px] text-stone-700 leading-snug">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-stone-400 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] text-stone-500 italic">Bullet highlights appear here</p>
            )}
          </div>

          {/* Full description */}
          <div>
            <p className="text-[9px] tracking-[0.2em] uppercase text-stone-600 mb-1.5">About this piece</p>
            {p.longDescription.trim() && looksLikeHtml(p.longDescription) ? (
              <div
                className="rte-content text-[11px] text-stone-600 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: p.longDescription }}
              />
            ) : (
              <p className="text-[11px] text-stone-600 leading-relaxed line-clamp-4 whitespace-pre-line">
                {p.longDescription.trim() ||
                  p.description.trim() ||
                  "The full description shown on the detail page appears here."}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ProductForm({ product, categories = [] }: ProductFormProps) {
  const router = useRouter()
  const isEdit = !!product
  const [isPending, startTransition] = useTransition()

  const [name, setName] = useState(product?.name ?? "")
  const [material, setMaterial] = useState(product?.material ?? "")
  const [description, setDescription] = useState(product?.description ?? "")
  const [longDescription, setLongDescription] = useState(product?.longDescription ?? "")
  const [features, setFeatures] = useState<string[]>(product?.features?.length ? product.features : [""])
  const [category, setCategory] = useState(product?.category ?? "")
  // Category picker list — seeded from the categories already used across the
  // catalog, plus this product's own. Admins can add or remove entries here; a
  // new one is saved to the catalog the moment a product is created under it.
  const [categoryList, setCategoryList] = useState<string[]>(() => {
    const seed = new Set(categories.filter(Boolean))
    if (product?.category) seed.add(product.category)
    return Array.from(seed).sort()
  })
  const [newCategoryDraft, setNewCategoryDraft] = useState("")
  // Category rename/delete are catalog-wide, so they run through their own
  // transition (kept separate from the product Save button's pending state).
  const [categoryPending, startCategoryTransition] = useTransition()
  const [renaming, setRenaming] = useState(false)
  const [renameDraft, setRenameDraft] = useState("")
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<string | null>(null)
  const [price, setPrice] = useState(product?.price?.toString() ?? "")
  const [discountPrice, setDiscountPrice] = useState(product?.discountPrice?.toString() ?? "")
  const [stock, setStock] = useState(product?.stock?.toString() ?? "0")
  const [tags, setTags] = useState(product?.tags?.join(", ") ?? "")
  const [sizes, setSizes] = useState(product?.sizes?.join(", ") ?? "")
  const [dimH, setDimH] = useState(product?.dimensions?.h?.toString() ?? "")
  const [dimW, setDimW] = useState(product?.dimensions?.w?.toString() ?? "")
  const [dimD, setDimD] = useState(product?.dimensions?.d?.toString() ?? "")
  const [image, setImage] = useState(product?.image ?? "")
  const [gallery, setGallery] = useState<string[]>(product?.gallery?.length ? product.gallery : [""])
  const [seoTitle, setSeoTitle] = useState(product?.seoTitle ?? "")
  const [seoDescription, setSeoDescription] = useState(product?.seoDescription ?? "")
  const [errors, setErrors] = useState<Record<string, string>>({})

  const DESC_LIMIT = 160 // ≈ two lines in the quick-view popup

  function updateGallery(idx: number, val: string) {
    setGallery((prev) => prev.map((g, i) => (i === idx ? val : g)))
  }
  function addGalleryRow() {
    setGallery((prev) => [...prev, ""])
  }
  function removeGalleryRow(idx: number) {
    setGallery((prev) => prev.filter((_, i) => i !== idx))
  }

  function addCategory() {
    const c = newCategoryDraft.trim()
    if (!c) return
    setCategoryList((prev) => (prev.includes(c) ? prev : [...prev, c].sort()))
    setCategory(c)
    setNewCategoryDraft("")
    setErrors((prev) => ({ ...prev, category: "" }))
  }

  function startRename() {
    setRenameDraft(category)
    setRenaming(true)
  }

  function cancelRename() {
    setRenaming(false)
    setRenameDraft("")
  }

  function saveRename() {
    const from = category
    const to = renameDraft.trim()
    if (!from || !to || to === from) {
      cancelRename()
      return
    }
    if (categoryList.includes(to)) {
      toast.error(`"${to}" already exists.`)
      return
    }
    startCategoryTransition(async () => {
      try {
        await renameCategoryAction(from, to)
        setCategoryList((prev) => Array.from(new Set(prev.map((x) => (x === from ? to : x)))).sort())
        setCategory(to)
        cancelRename()
        toast.success(`Category renamed to "${to}".`)
      } catch {
        toast.error("Couldn't rename the category.")
      }
    })
  }

  function confirmDeleteCategory() {
    const name = deleteCategoryTarget
    if (!name) return
    startCategoryTransition(async () => {
      try {
        await deleteCategoryAction(name)
        setCategoryList((prev) => prev.filter((x) => x !== name))
        if (category === name) setCategory("")
        toast.success(`Category "${name}" deleted.`)
      } catch {
        toast.error("Couldn't delete the category.")
      } finally {
        setDeleteCategoryTarget(null)
      }
    })
  }

  function updateFeature(idx: number, val: string) {
    setFeatures((prev) => prev.map((f, i) => (i === idx ? val : f)))
  }
  function addFeatureRow() {
    setFeatures((prev) => [...prev, ""])
  }
  function removeFeatureRow(idx: number) {
    setFeatures((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev))
  }

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = "Name is required"
    if (!category.trim()) errs.category = "Category is required"
    if (!price || Number(price) <= 0) errs.price = "Enter a valid price"
    if (stock === "" || Number(stock) < 0) errs.stock = "Enter a valid stock quantity"
    if (!image.trim()) errs.image = "A main image URL is required"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) {
      toast.error("Please review the highlighted fields.")
      return
    }

    const galleryUrls = gallery.map((g) => g.trim()).filter(Boolean)
    const cleanFeatures = features.map((f) => f.trim()).filter(Boolean)
    const input: ProductInput = {
      name: name.trim(),
      material: material.trim(),
      description: description.trim(),
      longDescription: longDescription.trim() || undefined,
      price: Number(price),
      // 0 / blank / negative means "no discount" — never store it as a price.
      discountPrice: activeDiscount(discountPrice),
      category: category.trim(),
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      sizes: sizes.split(",").map((s) => s.trim()).filter(Boolean),
      stock: Number(stock),
      dimensions: { h: Number(dimH) || 0, w: Number(dimW) || 0, d: Number(dimD) || 0 },
      accent: product?.accent ?? "from-stone-50 to-stone-200",
      image: image.trim(),
      gallery: galleryUrls.length ? galleryUrls : [image.trim()],
      galleryLabels: product?.galleryLabels,
      colors: product?.colors,
      features: cleanFeatures,
      seoTitle: seoTitle.trim() || undefined,
      seoDescription: seoDescription.trim() || undefined,
    }

    startTransition(async () => {
      if (isEdit) {
        await updateProductAction(product!.id, input)
        toast.success("Product updated.")
      } else {
        await createProductAction(input)
        toast.success("Product created.")
      }
      router.push("/products")
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <Link href="/products" className="inline-flex items-center gap-1.5 text-[12px] text-stone-500 hover:text-stone-800 mb-6">
        <ArrowLeft size={13} /> Back to Products
      </Link>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start">
        {/* ── Form column ── */}
        <div className="rounded-lg border border-stone-200 bg-white p-6 space-y-8 min-w-0">
          {/* Basics */}
          <section className="space-y-4">
            <SectionHeader title="Basics" where="Title & labels everywhere" />
            <Field label="Product Name" hint="Shown as the title everywhere this product appears — shop grid, quick view, product page, and cart.">
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="The Kinetic Sculpt Chair" />
              {errors.name && <p className="text-[11px] text-red-600 mt-1">{errors.name}</p>}
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Material" hint="A short material label shown under the product name.">
                <input value={material} onChange={(e) => setMaterial(e.target.value)} className={inputCls} placeholder="Black Steel + Sheesham Wood" />
              </Field>
              <Field label="Category" hint="Used for shop filtering — pick an existing category, or add a new one. Editing or deleting a category updates every product that uses it. New categories are saved to the catalog when this product is created.">
                {renaming ? (
                  // Inline rename — applies across the whole catalog on save.
                  <div className="flex items-center gap-1.5">
                    <input
                      value={renameDraft}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); saveRename() }
                        if (e.key === "Escape") { e.preventDefault(); cancelRename() }
                      }}
                      autoFocus
                      className={`${inputCls} cursor-text`}
                      placeholder="New category name"
                    />
                    <button type="button" onClick={saveRename} disabled={categoryPending} className="flex-shrink-0 px-2.5 py-2 text-[12px] font-medium text-white bg-stone-900 rounded-md hover:bg-stone-700 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed">
                      {categoryPending ? "Saving…" : "Save"}
                    </button>
                    <button type="button" onClick={cancelRename} className="flex-shrink-0 p-2 text-stone-600 hover:text-stone-900 cursor-pointer" aria-label="Cancel rename">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${inputCls} cursor-pointer`}>
                      <option value="">Select a category…</option>
                      {categoryList.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>

                    {/* Add a category inline */}
                    <div className="mt-2 flex items-center gap-1.5">
                      <input
                        value={newCategoryDraft}
                        onChange={(e) => setNewCategoryDraft(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCategory() } }}
                        className={`${inputCls} text-[12px] py-1.5`}
                        placeholder="Add a new category…"
                      />
                      <button
                        type="button"
                        onClick={addCategory}
                        className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium rounded-md border border-stone-200 text-stone-600 hover:bg-stone-50 cursor-pointer transition-colors"
                      >
                        <Plus size={13} /> Add
                      </button>
                    </div>

                    {/* Edit / delete the selected category */}
                    {category && categoryList.includes(category) && (
                      <div className="mt-1.5 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={startRename}
                          disabled={categoryPending}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-600 hover:text-stone-900 cursor-pointer transition-colors disabled:opacity-50"
                        >
                          <Pencil size={12} /> Edit “{category}”
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteCategoryTarget(category)}
                          disabled={categoryPending}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-600 hover:text-red-600 cursor-pointer transition-colors disabled:opacity-50"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    )}
                  </>
                )}

                {errors.category && <p className="text-[11px] text-red-600 mt-1">{errors.category}</p>}
              </Field>
            </div>
          </section>

          {/* Quick View — short description */}
          <section className="space-y-4 border-t border-stone-100 pt-6">
            <SectionHeader title="Quick View" where="Popup when a customer clicks a product" />
            <Field
              label="Short Description"
              hint="Shown in the quick-view popup and truncated to about two lines. Keep it punchy — a one-sentence hook works best."
            >
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                maxLength={DESC_LIMIT}
                className={`${inputCls} resize-none`}
                placeholder="Premium minimalist steel frame with handcrafted wooden arm accents."
              />
              <div className="mt-1 flex items-center justify-between">
                <span className="text-[11px] text-stone-600">≈ 2 lines max in the popup</span>
                <span className={`text-[11px] tabular-nums ${description.length >= DESC_LIMIT ? "text-[#7a3535]" : "text-stone-600"}`}>
                  {description.length}/{DESC_LIMIT}
                </span>
              </div>
            </Field>
          </section>

          {/* Highlights — bullets */}
          <section className="space-y-4 border-t border-stone-100 pt-6">
            <SectionHeader title="Product Highlights" where="Bullet points on the detail page" />
            <p className="text-[12px] text-stone-500 -mt-2">
              Short, scannable selling points. Each line becomes one bullet in the “Highlights” list on the product page.
            </p>
            <div className="space-y-2">
              {features.map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-stone-300 flex-shrink-0" />
                  <input
                    value={f}
                    onChange={(e) => updateFeature(i, e.target.value)}
                    className={inputCls}
                    placeholder={`Highlight ${i + 1} — e.g. Heavy-gauge steel frame, powder-coated matte black`}
                  />
                  {features.length > 1 && (
                    <button type="button" onClick={() => removeFeatureRow(i)} className="p-2 text-stone-600 hover:text-red-600 cursor-pointer flex-shrink-0">
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addFeatureRow}
                className="inline-flex items-center gap-1.5 text-[12px] font-medium text-stone-600 hover:text-stone-900 cursor-pointer"
              >
                <Plus size={13} /> Add Highlight
              </button>
            </div>
          </section>

          {/* Full description */}
          <section className="space-y-4 border-t border-stone-100 pt-6">
            <SectionHeader title="Full Description" where="“About this piece” on the detail page" />
            <Field
              label="Detailed Description"
              hint="The long write-up shown in the “About This Piece” section of the product page. Use the toolbar for bold text and bullet points. Optional — falls back to the short description if empty."
            >
              <RichTextEditor
                value={longDescription}
                onChange={setLongDescription}
                placeholder="Tell the full story of this piece — materials, craftsmanship, and how it lives in a home. Use bold and bullet points to highlight key details."
              />
            </Field>
          </section>

          {/* Pricing & stock */}
          <section className="space-y-4 border-t border-stone-100 pt-6">
            <SectionHeader title="Pricing & Stock" where="Price shown on card, popup & detail page" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label="Price (PKR)" hint="Regular price.">
                <input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} className={inputCls} />
                {errors.price && <p className="text-[11px] text-red-600 mt-1">{errors.price}</p>}
              </Field>
              <Field label="Discount Price (optional)" hint="If set, shown instead of the regular price. Leave blank for no discount.">
                <input type="number" min={0} value={discountPrice} onChange={(e) => setDiscountPrice(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Stock Quantity" hint="Shown as a low-stock warning in the products list.">
                <input type="number" min={0} value={stock} onChange={(e) => setStock(e.target.value)} className={inputCls} />
                {errors.stock && <p className="text-[11px] text-red-600 mt-1">{errors.stock}</p>}
              </Field>
            </div>
          </section>

          {/* Tags, sizes, dimensions */}
          <section className="space-y-4 border-t border-stone-100 pt-6">
            <SectionHeader title="Variants & Dimensions" where="Shop filters & detail page specs" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Tags" hint="Comma-separated">
                <input value={tags} onChange={(e) => setTags(e.target.value)} className={inputCls} placeholder="bestseller, steel, handcrafted" />
              </Field>
              <Field label="Sizes / Variants" hint="Comma-separated">
                <input value={sizes} onChange={(e) => setSizes(e.target.value)} className={inputCls} placeholder="Standard, Large" />
              </Field>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Field label="Height (cm)">
                <input type="number" min={0} value={dimH} onChange={(e) => setDimH(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Width (cm)">
                <input type="number" min={0} value={dimW} onChange={(e) => setDimW(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Depth (cm)">
                <input type="number" min={0} value={dimD} onChange={(e) => setDimD(e.target.value)} className={inputCls} />
              </Field>
            </div>
          </section>

          {/* Images */}
          <section className="space-y-4 border-t border-stone-100 pt-6">
            <SectionHeader title="Images" where="Shop grid, popup & detail gallery" />
            <p className="text-[12px] text-stone-500 -mt-2">
              Paste a link to an existing image, or click Upload to add a file from your device — both work everywhere below.
            </p>
            <Field
              label="Main Image"
              hint="Used on the shop grid, the quick-view popup, and as the first photo on the product detail page. Required."
            >
              <ImageUrlInput value={image} onChange={setImage} placeholder="/1.jpg.jpeg or https://…" />
              {errors.image && <p className="text-[11px] text-red-600 mt-1">{errors.image}</p>}
            </Field>
            <Field
              label="Gallery Images"
              hint="Extra photos shown on the product detail page (e.g. side views, close-ups). Optional — add as many as needed."
            >
              <div className="space-y-2">
                {gallery.map((g, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex-1">
                      <ImageUrlInput value={g} onChange={(url) => updateGallery(i, url)} placeholder={`/gallery-${i + 1}.jpg or https://…`} />
                    </div>
                    {gallery.length > 1 && (
                      <button type="button" onClick={() => removeGalleryRow(i)} className="p-2 text-stone-600 hover:text-red-600 cursor-pointer flex-shrink-0">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addGalleryRow}
                  className="inline-flex items-center gap-1.5 text-[12px] font-medium text-stone-600 hover:text-stone-900 cursor-pointer"
                >
                  <Plus size={13} /> Add Image
                </button>
              </div>
            </Field>
          </section>

          {/* SEO */}
          <section className="space-y-4 border-t border-stone-100 pt-6">
            <SectionHeader title="SEO" where="Search results & link previews" />
            <p className="text-[12px] text-stone-500 -mt-2">
              Not shown on the page itself — used by search engines and link previews. Optional.
            </p>
            <Field label="SEO Title" hint="Shown as the page title in search results and browser tabs.">
              <input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} className={inputCls} placeholder="The Kinetic Sculpt Chair — Alloyed Living" />
            </Field>
            <Field label="Meta Description" hint="The short summary shown under the title in search results.">
              <textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} rows={2} className={`${inputCls} resize-none`} />
            </Field>
          </section>
        </div>

        {/* ── Live preview column ── */}
        <aside className="xl:sticky xl:top-6">
          <LivePreview
            image={image}
            name={name}
            material={material}
            category={category}
            description={description}
            price={price}
            discountPrice={discountPrice}
            features={features}
            longDescription={longDescription}
          />
        </aside>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Link href="/products" className="px-4 py-2 text-[13px] font-medium text-stone-600 rounded-md hover:bg-stone-100 transition-colors">
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2 text-[13px] font-medium text-white bg-stone-900 rounded-md hover:bg-stone-700 transition-colors disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
        >
          {isPending ? "Saving…" : isEdit ? "Save Changes" : "Create Product"}
        </button>
      </div>

      <ConfirmDialog
        open={!!deleteCategoryTarget}
        title="Delete category?"
        description={`"${deleteCategoryTarget}" will be removed from the catalog. Any products using it will be left uncategorized.`}
        confirmLabel="Delete category"
        loading={categoryPending}
        onConfirm={confirmDeleteCategory}
        onCancel={() => setDeleteCategoryTarget(null)}
      />
    </form>
  )
}
