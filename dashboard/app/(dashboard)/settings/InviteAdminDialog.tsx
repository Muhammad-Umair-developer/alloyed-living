"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { UserPlus, ShieldAlert, MailCheck } from "lucide-react"
import { useRouter } from "next/navigation"
import { inviteAdminAction } from "@/src/actions/settings-actions"
import {
  ASSIGNABLE_ADMIN_ROLES,
  DEFAULT_INVITE_ROLE,
  type DashboardRole,
} from "@/src/lib/auth/roles"

const inputCls =
  "w-full px-3 py-2 text-[13px] rounded-md border border-stone-200 bg-white outline-none focus:border-stone-400 transition-colors"

const ROLE_HINT: Record<DashboardRole, string> = {
  admin: "Full dashboard access. Cannot invite or manage other admins.",
  owner: "Full access, including inviting and managing other admins.",
}

export default function InviteAdminDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<DashboardRole>(DEFAULT_INVITE_ROLE)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // When set, the invite succeeded and we show the confirmation panel instead
  // of the form (so the spam-folder note is visible until dismissed).
  const [sentTo, setSentTo] = useState<string | null>(null)

  function reset() {
    setEmail("")
    setRole(DEFAULT_INVITE_ROLE)
    setError(null)
    setSubmitting(false)
    setSentTo(null)
  }

  function handleClose() {
    if (submitting) return
    reset()
    onClose()
  }

  function inviteAnother() {
    setEmail("")
    setRole(DEFAULT_INVITE_ROLE)
    setError(null)
    setSentTo(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const result = await inviteAdminAction(email, role)

    if (!result.ok) {
      setError(result.message)
      setSubmitting(false)
      return
    }

    setSentTo(email.trim().toLowerCase())
    setSubmitting(false)
    // Refresh the admin list so the new "Pending" row appears behind the dialog.
    router.refresh()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="invite-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[150] bg-stone-900/30 backdrop-blur-[2px] flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            key="invite-box"
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-lg bg-white shadow-xl border border-stone-200 p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="invite-title"
          >
            {sentTo ? (
              /* ── Success state ── */
              <div>
                <div className="w-10 h-10 rounded-full flex items-center justify-center mb-4 bg-[var(--accent-soft)]">
                  <MailCheck size={18} strokeWidth={1.75} className="text-[var(--accent)]" />
                </div>
                <h2 id="invite-title" className="text-[15px] font-semibold text-stone-900 mb-1.5">
                  Invitation sent
                </h2>
                <p className="text-[13px] text-stone-500 leading-relaxed">
                  We&apos;ve emailed an invite to{" "}
                  <span className="font-medium text-stone-700">{sentTo}</span>.
                </p>
                <div className="mt-4 rounded-md border border-amber-200 bg-amber-50/70 px-3 py-2.5">
                  <p className="text-[12px] leading-relaxed text-amber-800">
                    Ask them to check their <span className="font-medium">spam / junk folder</span> if
                    it isn&apos;t in the inbox within a few minutes — and to mark it “Not spam” so future
                    emails arrive normally.
                  </p>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button
                    type="button"
                    onClick={inviteAnother}
                    className="px-4 py-2 text-[13px] font-medium text-stone-600 rounded-md hover:bg-stone-100 transition-colors duration-150 cursor-pointer"
                  >
                    Invite another
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 text-[13px] font-medium rounded-md text-white bg-stone-900 hover:bg-stone-700 transition-colors duration-150 cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              /* ── Form state ── */
              <div>
                <div className="w-10 h-10 rounded-full flex items-center justify-center mb-4 bg-[var(--accent-soft)]">
                  <UserPlus size={18} strokeWidth={1.75} className="text-[var(--accent)]" />
                </div>
                <h2 id="invite-title" className="text-[15px] font-semibold text-stone-900 mb-1.5">
                  Invite an admin
                </h2>
                <p className="text-[13px] text-stone-500 leading-relaxed mb-5">
                  They&apos;ll receive an email invitation to set a password and join the dashboard.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                  {error && (
                    <div className="flex items-start gap-2 rounded-md border border-[#7a3535]/25 bg-[#f5f0ef] px-3 py-2.5">
                      <ShieldAlert size={14} className="text-[#7a3535] mt-px flex-shrink-0" />
                      <p className="text-[12px] leading-relaxed text-[#5c2e2e]">{error}</p>
                    </div>
                  )}

                  <div>
                    <label htmlFor="invite-email" className="block text-[12px] font-medium text-stone-700 mb-1.5">
                      Email address
                    </label>
                    <input
                      id="invite-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="off"
                      autoFocus
                      placeholder="name@example.com"
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label htmlFor="invite-role" className="block text-[12px] font-medium text-stone-700 mb-1.5">
                      Role
                    </label>
                    <select
                      id="invite-role"
                      value={role}
                      onChange={(e) => setRole(e.target.value as DashboardRole)}
                      className={`${inputCls} cursor-pointer capitalize`}
                    >
                      {ASSIGNABLE_ADMIN_ROLES.map((r) => (
                        <option key={r} value={r} className="capitalize">
                          {r}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-stone-400 mt-1.5 leading-relaxed">{ROLE_HINT[role]}</p>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={submitting}
                      className="px-4 py-2 text-[13px] font-medium text-stone-600 rounded-md hover:bg-stone-100 transition-colors duration-150 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 text-[13px] font-medium rounded-md text-white bg-stone-900 hover:bg-stone-700 transition-colors duration-150 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
                    >
                      {submitting ? "Sending…" : "Send invite"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
