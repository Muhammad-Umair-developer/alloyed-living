"use client"

import { motion, AnimatePresence } from "framer-motion"
import { AlertTriangle } from "lucide-react"

interface ConfirmDialogProps {
  open:        boolean
  title:       string
  description: string
  confirmLabel?: string
  danger?:     boolean
  loading?:    boolean
  onConfirm:   () => void
  onCancel:    () => void
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  danger = true,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="confirm-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[150] bg-stone-900/30 backdrop-blur-[2px] flex items-center justify-center p-4"
          onClick={onCancel}
        >
          <motion.div
            key="confirm-box"
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-lg bg-white shadow-xl border border-stone-200 p-6"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-4 ${danger ? "bg-red-50" : "bg-[var(--accent-soft)]"}`}>
              <AlertTriangle size={18} strokeWidth={1.75} className={danger ? "text-red-600" : "text-[var(--accent)]"} />
            </div>
            <h2 id="confirm-title" className="text-[15px] font-semibold text-stone-900 mb-1.5">
              {title}
            </h2>
            <p className="text-[13px] text-stone-500 leading-relaxed mb-6">{description}</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={onCancel}
                disabled={loading}
                className="px-4 py-2 text-[13px] font-medium text-stone-600 rounded-md hover:bg-stone-100 transition-colors duration-150 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className={`
                  px-4 py-2 text-[13px] font-medium rounded-md text-white transition-colors duration-150 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed
                  ${danger ? "bg-red-600 hover:bg-red-700" : "bg-[var(--accent)] hover:opacity-90"}
                `}
              >
                {loading ? "Working…" : confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
