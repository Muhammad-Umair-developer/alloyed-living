import Sidebar from "@/src/components/layout/Sidebar"
import DashboardGate from "@/src/components/layout/DashboardGate"

// Chrome for the authenticated admin area: fixed sidebar + offset content.
// Every route in this group is behind the proxy's session + admin-role gate,
// so the sidebar (which reads the signed-in admin's profile) only ever renders
// for authenticated admins — never on the public /login or /reset-password
// pages, which live in the sibling (auth) group.
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DashboardGate>
      <Sidebar />
      {/* pt-14 clears the mobile top bar; lg:ml-60 clears the fixed sidebar */}
      <main className="lg:ml-60 min-h-screen pt-14 lg:pt-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">{children}</div>
      </main>
    </DashboardGate>
  )
}
