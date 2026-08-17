// Historically gated the dashboard behind a "signed in THIS load" check (see
// load-guard.ts) — removed; valid sessions now persist across reloads, same
// as most apps. Access control is unconditional and server-side regardless:
// proxy.ts blocks unauthenticated/non-admin requests before any HTML is
// served, and every mutating server action independently re-verifies via
// requireDashboardUser(). Neither of those changed. This is now a pure
// pass-through, kept only so app/(dashboard)/layout.tsx doesn't need to
// change its render tree.
export default function DashboardGate({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
