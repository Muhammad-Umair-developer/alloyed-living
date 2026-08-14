"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { useAuth } from "@/src/context/AuthContext"
import { toast } from "@/src/components/ui/ToastAlert"
import { updateProfileAction } from "@/src/actions/account-actions"

const EASE_CINEMATIC: [number, number, number, number] = [0.16, 1, 0.3, 1]

// Same floating-label pattern as login/page.tsx and ReturnsPageView.tsx —
// reproduced locally (not imported) since neither exports it, matching how
// both of those files already each keep their own copy.
function FloatingInput({
  id,
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
  disabled = false,
}: {
  id: string
  label: string
  value: string
  onChange?: (val: string) => void
  type?: string
  autoComplete?: string
  disabled?: boolean
}) {
  const [focused, setFocused] = useState(false)
  const lifted = focused || value.length > 0

  return (
    <div className="relative">
      <input
        id={id}
        type={type}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoComplete={autoComplete}
        className={`
          w-full bg-transparent border-b pt-6 pb-2
          text-[13px] tracking-[0.02em] outline-none transition-colors duration-300 pr-2
          ${disabled ? "text-stone-500 border-stone-100 cursor-not-allowed" : "text-stone-800 border-stone-200"}
        `}
      />
      <label
        htmlFor={id}
        className={`
          absolute left-0 pointer-events-none text-stone-600 transition-all duration-300
          ${lifted
            ? "top-0 text-[8px] tracking-[0.28em] uppercase text-stone-700"
            : "top-[1.35rem] text-[12px] tracking-wide"
          }
        `}
      >
        {label}
      </label>
      {!disabled && (
        <motion.div
          animate={{ scaleX: focused ? 1 : 0 }}
          transition={{ duration: 0.36, ease: EASE_CINEMATIC }}
          className="absolute bottom-0 left-0 right-0 h-px bg-stone-800 origin-left"
        />
      )}
    </div>
  )
}

// Email is intentionally read-only here — it's the Supabase auth identity,
// not a profile field; changing it belongs to an account-settings/email-change
// flow this task doesn't build.
export default function ProfileSection() {
  const { user, profile } = useAuth()
  const [fullName, setFullName] = useState(profile?.full_name ?? "")
  const [phone, setPhone] = useState(profile?.phone ?? "")
  const [saving, setSaving] = useState(false)

  // Reseed local form state whenever the context's profile changes (e.g. on
  // first load, after AuthContext finishes its own fetch).
  useEffect(() => {
    setFullName(profile?.full_name ?? "")
    setPhone(profile?.phone ?? "")
  }, [profile])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim()) {
      toast.error("Please enter your name.")
      return
    }
    setSaving(true)
    const result = await updateProfileAction({ fullName, phone })
    setSaving(false)
    if (!result.ok) {
      toast.error(result.error ?? "Could not update your profile.")
      return
    }
    setFullName(result.fullName ?? fullName)
    setPhone(result.phone ?? phone)
    toast.success("Profile updated.")
  }

  return (
    <div className="border border-stone-100 bg-[#f7f5f2] rounded-sm p-6 md:p-8">
      <form onSubmit={handleSave} className="space-y-8 max-w-[420px]" noValidate>
        <FloatingInput id="profile-email" label="Email Address" value={user?.email ?? ""} disabled />
        <FloatingInput
          id="profile-name"
          label="Full Name"
          value={fullName}
          onChange={setFullName}
          autoComplete="name"
        />
        <FloatingInput
          id="profile-phone"
          label="Phone Number"
          value={phone}
          onChange={setPhone}
          type="tel"
          autoComplete="tel"
        />

        <motion.button
          type="submit"
          disabled={saving}
          whileTap={{ scale: 0.98 }}
          className="
            py-3 px-8
            bg-stone-900 text-white
            text-[9px] tracking-[0.4em] uppercase
            cursor-pointer disabled:opacity-60
            hover:bg-stone-700 transition-colors duration-500
          "
        >
          {saving ? "Saving…" : "Save Changes"}
        </motion.button>
      </form>
    </div>
  )
}
