"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, Search, Pencil, Trash2, Package, ChevronDown, X } from "lucide-react"
import type { Product } from "@/src/lib/data/types"
import EmptyState from "@/src/components/ui/EmptyState"
import ConfirmDialog from "@/src/components/ui/ConfirmDialog"
import { toast } from "@/src/components/ui/ToastAlert"
import {
  deleteProductAction,
  bulkDeleteProductsAction,
  bulkUpdateCategoryAction,
  bulkUpdateStockAction,
} from "@/src/actions/product-actions"

type SortKey = "name" | "price-asc" | "price-desc" | "stock-asc" | "stock-desc" | "updated"

const SORT_LABELS: Record<SortKey, string> = {
  name: "Name (A–Z)",
  "price-asc": "Price: Low to High",
  "price-desc": "Price: High to Low",
  "stock-asc": "Stock: Low to High",
  "stock-desc": "Stock: High to Low",
  updated: "Recently Updated",
}

export default function ProductsListView({ products }: { products: Product[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<string>("all")
  const [sort, setSort] = useState<SortKey>("updated")
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkCategoryDraft, setBulkCategoryDraft] = useState("")
  const [bulkStockDraft, setBulkStockDraft] = useState("")
  const [showCategoryInput, setShowCategoryInput] = useState(false)
  const [showStockInput, setShowStockInput] = useState(false)

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category))).sort(),
    [products],
  )

  const filtered = useMemo(() => {
    let list = products.filter((p) => {
      if (category !== "all" && p.category !== category) return false
      if (query.trim()) {
        const q = query.trim().toLowerCase()
        if (!p.name.toLowerCase().includes(q) && !p.material.toLowerCase().includes(q)) return false
      }
      return true
    })
    switch (sort) {
      case "name": list = [...list].sort((a, b) => a.name.localeCompare(b.name)); break
      case "price-asc": list = [...list].sort((a, b) => a.price - b.price); break
      case "price-desc": list = [...list].sort((a, b) => b.price - a.price); break
      case "stock-asc": list = [...list].sort((a, b) => a.stock - b.stock); break
      case "stock-desc": list = [...list].sort((a, b) => b.stock - a.stock); break
      case "updated": list = [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)); break
    }
    return list
  }, [products, query, category, sort])

  const allVisibleSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id))

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAllVisible() {
    setSelected((prev) => {
      if (allVisibleSelected) {
        const next = new Set(prev)
        filtered.forEach((p) => next.delete(p.id))
        return next
      }
      const next = new Set(prev)
      filtered.forEach((p) => next.add(p.id))
      return next
    })
  }

  function clearSelection() {
    setSelected(new Set())
    setShowCategoryInput(false)
    setShowStockInput(false)
  }

  function handleDeleteOne() {
    if (!deleteTarget) return
    startTransition(async () => {
      await deleteProductAction(deleteTarget.id)
      toast.success(`"${deleteTarget.name}" deleted.`)
      setDeleteTarget(null)
      router.refresh()
    })
  }

  function handleBulkDelete() {
    const ids = Array.from(selected)
    startTransition(async () => {
      await bulkDeleteProductsAction(ids)
      toast.success(`${ids.length} product${ids.length === 1 ? "" : "s"} deleted.`)
      setBulkDeleteOpen(false)
      clearSelection()
      router.refresh()
    })
  }

  function handleBulkCategory() {
    if (!bulkCategoryDraft.trim()) return
    const ids = Array.from(selected)
    startTransition(async () => {
      await bulkUpdateCategoryAction(ids, bulkCategoryDraft.trim())
      toast.success(`Category updated for ${ids.length} product${ids.length === 1 ? "" : "s"}.`)
      setBulkCategoryDraft("")
      setShowCategoryInput(false)
      clearSelection()
      router.refresh()
    })
  }

  function handleBulkStock() {
    const stock = Number(bulkStockDraft)
    if (Number.isNaN(stock) || stock < 0) return
    const ids = Array.from(selected)
    startTransition(async () => {
      await bulkUpdateStockAction(ids, stock)
      toast.success(`Stock updated for ${ids.length} product${ids.length === 1 ? "" : "s"}.`)
      setBulkStockDraft("")
      setShowStockInput(false)
      clearSelection()
      router.refresh()
    })
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products…"
            className="w-full pl-9 pr-3 py-2 text-[13px] rounded-md border border-stone-200 bg-white outline-none focus:border-stone-400 transition-colors"
          />
        </div>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-2 text-[13px] rounded-md border border-stone-200 bg-white outline-none focus:border-stone-400 cursor-pointer"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="px-3 py-2 text-[13px] rounded-md border border-stone-200 bg-white outline-none focus:border-stone-400 cursor-pointer"
        >
          {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
            <option key={k} value={k}>{SORT_LABELS[k]}</option>
          ))}
        </select>

        <Link
          href="/products/new"
          className="ml-auto inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-stone-900 rounded-md hover:bg-stone-700 transition-colors"
        >
          <Plus size={14} strokeWidth={2} />
          Add Product
        </Link>
      </div>

      {/* Bulk actions toolbar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-4 px-4 py-3 rounded-md bg-[var(--accent-soft)] border border-[var(--accent)]/20">
          <span className="text-[13px] font-medium text-stone-700">{selected.size} selected</span>

          {showCategoryInput ? (
            <div className="flex items-center gap-1.5">
              <input
                value={bulkCategoryDraft}
                onChange={(e) => setBulkCategoryDraft(e.target.value)}
                placeholder="New category"
                autoFocus
                className="px-2.5 py-1.5 text-[12px] rounded-md border border-stone-300 outline-none focus:border-stone-500"
              />
              <button onClick={handleBulkCategory} disabled={isPending} className="px-2.5 py-1.5 text-[12px] font-medium text-white bg-stone-900 rounded-md hover:bg-stone-700 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed">
                Apply
              </button>
              <button onClick={() => setShowCategoryInput(false)} className="p-1.5 text-stone-400 hover:text-stone-700 cursor-pointer">
                <X size={13} />
              </button>
            </div>
          ) : (
            <button onClick={() => setShowCategoryInput(true)} className="text-[12px] font-medium text-stone-600 hover:text-stone-900 underline underline-offset-2 cursor-pointer">
              Change Category
            </button>
          )}

          {showStockInput ? (
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={0}
                value={bulkStockDraft}
                onChange={(e) => setBulkStockDraft(e.target.value)}
                placeholder="Stock qty"
                autoFocus
                className="w-24 px-2.5 py-1.5 text-[12px] rounded-md border border-stone-300 outline-none focus:border-stone-500"
              />
              <button onClick={handleBulkStock} disabled={isPending} className="px-2.5 py-1.5 text-[12px] font-medium text-white bg-stone-900 rounded-md hover:bg-stone-700 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed">
                Apply
              </button>
              <button onClick={() => setShowStockInput(false)} className="p-1.5 text-stone-400 hover:text-stone-700 cursor-pointer">
                <X size={13} />
              </button>
            </div>
          ) : (
            <button onClick={() => setShowStockInput(true)} className="text-[12px] font-medium text-stone-600 hover:text-stone-900 underline underline-offset-2 cursor-pointer">
              Update Stock
            </button>
          )}

          <button onClick={() => setBulkDeleteOpen(true)} className="text-[12px] font-medium text-red-600 hover:text-red-800 underline underline-offset-2 cursor-pointer">
            Delete Selected
          </button>

          <button onClick={clearSelection} className="ml-auto text-[12px] text-stone-500 hover:text-stone-800 cursor-pointer">
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-stone-200 bg-white">
          <EmptyState
            icon={Package}
            title="No products found"
            description={products.length === 0 ? "Add your first product to get started." : "Try adjusting your search or filters."}
            action={
              products.length === 0 ? (
                <Link href="/products/new" className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-stone-900 rounded-md hover:bg-stone-700">
                  <Plus size={14} /> Add Product
                </Link>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="rounded-lg border border-stone-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[760px]">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50/60">
                <th className="w-10 px-4 py-3">
                  <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} className="cursor-pointer" />
                </th>
                <th className="px-2 py-3 text-[11px] font-medium uppercase tracking-wide text-stone-400">Product</th>
                <th className="px-2 py-3 text-[11px] font-medium uppercase tracking-wide text-stone-400">Category</th>
                <th className="px-2 py-3 text-[11px] font-medium uppercase tracking-wide text-stone-400">Price</th>
                <th className="px-2 py-3 text-[11px] font-medium uppercase tracking-wide text-stone-400">Stock</th>
                <th className="px-2 py-3 text-[11px] font-medium uppercase tracking-wide text-stone-400">Tags</th>
                <th className="w-24 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-stone-50 last:border-0 hover:bg-stone-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)} className="cursor-pointer" />
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-3">
                      <img src={p.image} alt={p.name} className="w-11 h-11 rounded-md object-cover bg-stone-100 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-stone-800 truncate max-w-[220px]">{p.name}</p>
                        <p className="text-[11px] text-stone-400 truncate max-w-[220px]">{p.material}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-3 text-[13px] text-stone-600">{p.category}</td>
                  <td className="px-2 py-3 text-[13px] text-stone-700 tabular-nums">
                    {p.discountPrice ? (
                      <span>
                        <span className="line-through text-stone-400 mr-1.5">PKR {p.price.toLocaleString()}</span>
                        PKR {p.discountPrice.toLocaleString()}
                      </span>
                    ) : (
                      <>PKR {p.price.toLocaleString()}</>
                    )}
                  </td>
                  <td className="px-2 py-3 text-[13px] tabular-nums">
                    <span className={p.stock === 0 ? "text-red-600 font-medium" : p.stock < 10 ? "text-amber-600" : "text-stone-600"}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex flex-wrap gap-1 max-w-[160px]">
                      {p.tags.slice(0, 2).map((t) => (
                        <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-500">{t}</span>
                      ))}
                      {p.tags.length > 2 && <span className="text-[10px] text-stone-400">+{p.tags.length - 2}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/products/${p.id}/edit`} className="p-1.5 text-stone-400 hover:text-stone-800 hover:bg-stone-100 rounded-md transition-colors" aria-label={`Edit ${p.name}`}>
                        <Pencil size={14} strokeWidth={1.75} />
                      </Link>
                      <button onClick={() => setDeleteTarget(p)} className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer" aria-label={`Delete ${p.name}`}>
                        <Trash2 size={14} strokeWidth={1.75} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete product?"
        description={`"${deleteTarget?.name}" will be permanently removed from the catalog and storefront.`}
        loading={isPending}
        onConfirm={handleDeleteOne}
        onCancel={() => setDeleteTarget(null)}
      />
      <ConfirmDialog
        open={bulkDeleteOpen}
        title="Delete selected products?"
        description={`${selected.size} product${selected.size === 1 ? "" : "s"} will be permanently removed.`}
        loading={isPending}
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleteOpen(false)}
      />

      <div className="flex items-center gap-1 mt-4 text-[10px] text-stone-400">
        <ChevronDown size={11} className="rotate-180" />
        Showing {filtered.length} of {products.length}
      </div>
    </div>
  )
}
