"use client"

import { useCallback, useEffect, useState } from "react"
import { motion } from "framer-motion"
import { MapPin, Plus } from "lucide-react"
import { toast } from "@/src/components/ui/ToastAlert"
import { listAddressesAction, deleteAddressAction, setDefaultAddressAction } from "@/src/actions/account-actions"
import AddressDialog from "./AddressDialog"
import type { Address } from "@/src/lib/data/types"

export default function AddressBookSection() {
  const [addresses, setAddresses] = useState<Address[] | null>(null) // null = still loading
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Address | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const list = await listAddressesAction()
      setAddresses(list)
    } catch {
      toast.error("Could not load your saved addresses.")
      setAddresses([])
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function openAdd() {
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(addr: Address) {
    setEditing(addr)
    setDialogOpen(true)
  }

  // Merges a create/update result into local state without a full reload.
  // createAddress auto-defaults a user's first address — if this save came
  // back as the default, clear that flag on every other row locally too, so
  // the list never shows two "Default" badges before the next refetch.
  function handleSaved(addr: Address) {
    setAddresses((prev) => {
      if (!prev) return [addr]
      const exists = prev.some((a) => a.id === addr.id)
      const next = exists ? prev.map((a) => (a.id === addr.id ? addr : a)) : [...prev, addr]
      return addr.isDefault ? next.map((a) => (a.id === addr.id ? a : { ...a, isDefault: false })) : next
    })
  }

  async function handleDelete(id: string) {
    setBusyId(id)
    const result = await deleteAddressAction(id)
    setBusyId(null)
    setConfirmDeleteId(null)
    if (!result.ok) {
      toast.error(result.error ?? "Could not delete this address.")
      return
    }
    setAddresses((prev) => (prev ? prev.filter((a) => a.id !== id) : prev))
    toast.success("Address removed.")
  }

  async function handleSetDefault(id: string) {
    setBusyId(id)
    const result = await setDefaultAddressAction(id)
    setBusyId(null)
    if (!result.ok || !result.address) {
      toast.error(result.error ?? "Could not set this as your default address.")
      return
    }
    setAddresses((prev) => (prev ? prev.map((a) => ({ ...a, isDefault: a.id === id })) : prev))
    toast.success("Default address updated.")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-[9px] tracking-[0.3em] uppercase text-stone-600">
          {addresses ? `${addresses.length} Saved Address${addresses.length === 1 ? "" : "es"}` : "Loading…"}
        </p>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 text-[9px] tracking-[0.3em] uppercase text-stone-700 hover:text-stone-900 transition-colors duration-300 cursor-pointer"
        >
          <Plus size={12} strokeWidth={1.5} />
          Add Address
        </button>
      </div>

      {addresses === null ? (
        <div className="border border-stone-100 bg-[#f7f5f2] rounded-sm p-10 text-center">
          <p className="text-[11px] text-stone-600">Loading your addresses…</p>
        </div>
      ) : addresses.length === 0 ? (
        <div className="border border-stone-100 bg-[#f7f5f2] rounded-sm py-14 flex flex-col items-center gap-6 text-center">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
              <MapPin size={24} strokeWidth={1} className="text-stone-500" />
            </div>
            <motion.div
              className="absolute inset-0 rounded-full border border-stone-200"
              animate={{ scale: [1, 1.22, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
          <div className="space-y-2">
            <p className="text-[12px] tracking-[0.2em] uppercase text-stone-700">No saved addresses yet</p>
            <p className="text-[11px] text-stone-600 max-w-[220px] mx-auto leading-relaxed">
              Add one to speed up checkout next time.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className="border border-stone-200 bg-white rounded-sm p-5 flex items-start justify-between gap-4"
            >
              <div className="min-w-0">
                {addr.label && (
                  <p className="text-[8px] tracking-[0.3em] uppercase text-stone-600 mb-1.5">{addr.label}</p>
                )}
                <p className="text-[13px] text-stone-800 leading-relaxed">{addr.street}</p>
                <p className="text-[12px] text-stone-600">
                  {addr.city}
                  {addr.province ? `, ${addr.province}` : ""}
                  {addr.postalCode ? ` ${addr.postalCode}` : ""}
                </p>
                <p className="text-[12px] text-stone-600">{addr.country}</p>
                {addr.isDefault && (
                  <span className="inline-block mt-2.5 text-[8px] tracking-[0.24em] uppercase px-2 py-1 bg-[#5c6b4a]/10 text-[#5c6b4a]">
                    Default
                  </span>
                )}
              </div>

              <div className="flex flex-col items-end gap-2.5 text-[8px] tracking-[0.24em] uppercase flex-shrink-0">
                {!addr.isDefault && (
                  <button
                    onClick={() => handleSetDefault(addr.id)}
                    disabled={busyId === addr.id}
                    className="text-stone-600 hover:text-stone-900 transition-colors duration-300 disabled:opacity-50 cursor-pointer"
                  >
                    Set Default
                  </button>
                )}
                <button
                  onClick={() => openEdit(addr)}
                  className="text-stone-600 hover:text-stone-900 transition-colors duration-300 cursor-pointer"
                >
                  Edit
                </button>
                {confirmDeleteId === addr.id ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-stone-500 hover:text-stone-800 transition-colors duration-300 cursor-pointer"
                    >
                      Never Mind
                    </button>
                    <button
                      onClick={() => handleDelete(addr.id)}
                      disabled={busyId === addr.id}
                      className="text-[#7a3535] hover:text-[#5c2e2e] transition-colors duration-300 disabled:opacity-50 cursor-pointer"
                    >
                      {busyId === addr.id ? "Removing…" : "Confirm"}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(addr.id)}
                    className="text-[#7a3535] hover:text-[#5c2e2e] transition-colors duration-300 cursor-pointer"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <AddressDialog open={dialogOpen} address={editing} onClose={() => setDialogOpen(false)} onSaved={handleSaved} />
    </div>
  )
}
