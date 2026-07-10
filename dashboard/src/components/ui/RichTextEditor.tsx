"use client"

import { useEffect, useRef } from "react"
import { Bold, List } from "lucide-react"

// A deliberately tiny rich-text field — no editor dependency. It wraps a
// contentEditable region and exposes just the two formats the product
// description needs: bold text and bullet points (MS Word–style). The value is
// stored/emitted as a small, sanitized HTML string.

const ALLOWED_TAGS = new Set(["B", "STRONG", "I", "EM", "UL", "OL", "LI", "P", "BR", "DIV"])

// Keep only whitelisted formatting tags; unwrap anything else (e.g. pasted
// <span style>) so its text survives, and strip every attribute.
function sanitize(html: string): string {
  if (typeof document === "undefined") return html
  const root = document.createElement("div")
  root.innerHTML = html

  const walk = (node: Node) => {
    // Snapshot children first — we mutate the tree as we go.
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType !== Node.ELEMENT_NODE) return
      const el = child as HTMLElement
      if (ALLOWED_TAGS.has(el.tagName)) {
        Array.from(el.attributes).forEach((a) => el.removeAttribute(a.name))
        walk(el)
      } else {
        // Unwrap: move children up in place, then drop the element.
        const parent = el.parentNode
        if (parent) {
          while (el.firstChild) parent.insertBefore(el.firstChild, el)
          parent.removeChild(el)
        }
        walk(node)
      }
    })
  }

  walk(root)
  return root.innerHTML
}

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
}

export default function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null)

  // Seed the editor from `value` on mount and when the value changes from the
  // outside (e.g. loading an existing product) — but never while the user is
  // typing in it, which would reset the caret to the start.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (document.activeElement === el) return
    if (el.innerHTML !== (value || "")) el.innerHTML = value || ""
  }, [value])

  function emit() {
    if (ref.current) onChange(sanitize(ref.current.innerHTML))
  }

  function exec(command: string) {
    document.execCommand(command, false)
    ref.current?.focus()
    emit()
  }

  const btnCls =
    "inline-flex items-center justify-center w-7 h-7 rounded text-stone-600 hover:bg-stone-100 hover:text-stone-900 cursor-pointer transition-colors"

  return (
    <div className={`rounded-md border border-stone-200 bg-white overflow-hidden ${className ?? ""}`}>
      {/* Formatting toolbar */}
      <div className="flex items-center gap-1 border-b border-stone-100 px-1.5 py-1">
        {/* onMouseDown preventDefault keeps the editor's selection while clicking */}
        <button type="button" title="Bold" aria-label="Bold" className={btnCls} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("bold")}>
          <Bold size={14} strokeWidth={2.25} />
        </button>
        <button type="button" title="Bullet list" aria-label="Bullet list" className={btnCls} onMouseDown={(e) => e.preventDefault()} onClick={() => exec("insertUnorderedList")}>
          <List size={15} strokeWidth={2} />
        </button>
      </div>

      {/* Editable region */}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
        data-placeholder={placeholder}
        className="rte-content min-h-[140px] px-3 py-2 text-[13px] leading-relaxed text-stone-800 outline-none"
      />

      {/* Scoped presentation for the bullet list + placeholder (Tailwind's reset
          strips native list markers, so restore them here only inside the editor). */}
      <style>{`
        .rte-content ul { list-style: disc; padding-left: 1.25rem; margin: 0.25rem 0; }
        .rte-content ol { list-style: decimal; padding-left: 1.25rem; margin: 0.25rem 0; }
        .rte-content li { margin: 0.125rem 0; }
        .rte-content:empty:before { content: attr(data-placeholder); color: #a8a29e; }
      `}</style>
    </div>
  )
}
