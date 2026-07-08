"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Lock, KeyRound, Users, Plus, Sun, Moon, Monitor } from "lucide-react"
import type { Settings } from "@/src/lib/data/types"
import type { AdminProfile } from "@/src/lib/data/admins"
import { toast } from "@/src/components/ui/ToastAlert"
import { updateSettingsAction } from "@/src/actions/settings-actions"
import { useTheme, type ThemeChoice } from "@/src/context/ThemeContext"
import InviteAdminDialog from "./InviteAdminDialog"

const THEME_OPTIONS: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
]

function AppearanceCard() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-6">
      <p className="text-[11px] font-medium uppercase tracking-wide text-stone-600 mb-4">Appearance</p>
      <div>
        <label className="block text-[12px] font-medium text-stone-700 mb-2">Theme</label>
        <div className="inline-flex rounded-md border border-stone-200 p-1 gap-1">
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              aria-pressed={theme === value}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded transition-colors cursor-pointer ${
                theme === value
                  ? "bg-stone-900 text-white"
                  : "text-stone-600 hover:bg-stone-50"
              }`}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-stone-600 mt-2">
          {theme === "system"
            ? `Following your device — currently ${resolvedTheme}.`
            : "Your choice is saved on this device."}
        </p>
      </div>
    </div>
  )
}

const inputCls = "w-full px-3 py-2 text-[13px] rounded-md border border-stone-200 bg-white outline-none focus:border-stone-400 transition-colors"

const ROLE_STYLES: Record<string, string> = {
  owner: "bg-[var(--accent-soft)] text-[var(--accent)]",
  admin: "bg-sky-50 text-sky-700",
}

export default function SettingsView({
  settings,
  admins,
  canInvite,
}: {
  settings: Settings
  admins: AdminProfile[]
  canInvite: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [storeName, setStoreName] = useState(settings.storeName)
  const [accentColor, setAccentColor] = useState(settings.accentColor)
  const [supportEmail, setSupportEmail] = useState(settings.supportEmail)
  const [inviteOpen, setInviteOpen] = useState(false)

  function handleSave() {
    startTransition(async () => {
      await updateSettingsAction({ storeName, accentColor, supportEmail })
      toast.success("Store settings updated.")
      router.refresh()
    })
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Appearance — theme mode */}
      <AppearanceCard />

      {/* Store details */}
      <div className="rounded-lg border border-stone-200 bg-white p-6">
        <p className="text-[11px] font-medium uppercase tracking-wide text-stone-600 mb-4">Store Details</p>
        <div className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-stone-700 mb-1.5">Store Name</label>
            <input value={storeName} onChange={(e) => setStoreName(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-stone-700 mb-1.5">Support Email</label>
            <input value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-stone-700 mb-1.5">Brand Accent Color</label>
            <div className="flex items-center gap-3">
              <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="w-10 h-9 rounded-md border border-stone-200 cursor-pointer" />
              <input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className={inputCls} />
            </div>
          </div>
        </div>
        <div className="flex justify-end mt-5">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="px-4 py-2 text-[13px] font-medium text-white bg-stone-900 rounded-md hover:bg-stone-700 transition-colors disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
          >
            {isPending ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Admin roles */}
      <div className="rounded-lg border border-stone-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-stone-600">Admin Roles</p>
          <button
            onClick={() => setInviteOpen(true)}
            disabled={!canInvite}
            title={canInvite ? undefined : "Only owners can invite admins"}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
              canInvite
                ? "text-white bg-stone-900 hover:bg-stone-700 cursor-pointer"
                : "text-stone-600 bg-stone-50 cursor-not-allowed"
            }`}
          >
            <Plus size={13} /> Invite Admin
          </button>
        </div>

        {admins.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-10 h-10 rounded-full bg-stone-50 flex items-center justify-center mb-3">
              <Users size={16} className="text-stone-500" />
            </div>
            <p className="text-[13px] text-stone-500">No admins yet</p>
          </div>
        ) : (
          <ul className="divide-y divide-stone-100">
            {admins.map((admin) => (
              <li key={admin.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0">
                    <Users size={14} className="text-stone-600" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-stone-800">{admin.fullName || admin.email || "—"}</p>
                    <p className="text-[11px] text-stone-600">{admin.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {admin.pending && (
                    <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">
                      Pending
                    </span>
                  )}
                  <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full capitalize ${ROLE_STYLES[admin.role] ?? "bg-stone-100 text-stone-600"}`}>
                    {admin.role}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}

        {!canInvite && (
          <p className="text-[11px] text-stone-600 mt-4 flex items-center gap-1.5">
            <Lock size={11} /> Only owners can invite or manage admins.
          </p>
        )}
      </div>

      {/* API keys — placeholder, needs backend */}
      <div className="rounded-lg border border-stone-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-stone-600">API Keys</p>
          <button
            disabled
            title="Requires a real backend — coming soon"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-stone-600 bg-stone-50 rounded-md cursor-not-allowed"
          >
            <Plus size={13} /> Generate Key
          </button>
        </div>
        {settings.apiKeys.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-10 h-10 rounded-full bg-stone-50 flex items-center justify-center mb-3">
              <KeyRound size={16} className="text-stone-500" />
            </div>
            <p className="text-[13px] text-stone-500">No API keys yet</p>
            <p className="text-[11px] text-stone-600 mt-1 max-w-xs">
              Once a real backend is connected, generate keys here to let external services read and write storefront data.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-stone-100">
            {settings.apiKeys.map((key) => (
              <li key={key.key} className="flex items-center justify-between py-3">
                <span className="text-[13px] text-stone-700">{key.label}</span>
                <code className="text-[11px] text-stone-600">{key.key}</code>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Authentication status */}
      <div className="rounded-lg border border-stone-200 bg-stone-50/50 p-6">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-md bg-white border border-stone-200 flex items-center justify-center flex-shrink-0">
            <Lock size={16} strokeWidth={1.75} className="text-stone-600" />
          </div>
          <div>
            <p className="text-[13px] font-medium text-stone-700">Authentication — Active</p>
            <p className="text-[12px] text-stone-500 mt-1 leading-relaxed max-w-md">
              This dashboard is protected by Supabase Auth. Every page requires a signed-in
              account with the admin or owner role, and all data changes re-verify that role
              on the server. Owners can invite new admins from the panel above.
            </p>
          </div>
        </div>
      </div>

      <InviteAdminDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  )
}
