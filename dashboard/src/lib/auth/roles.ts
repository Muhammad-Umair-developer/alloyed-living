// Shared, framework-agnostic role model for the dashboard. Contains no secrets
// and does no I/O, so it is safe to import anywhere — the proxy, server actions,
// server components, and client components alike.
//
// profiles.role values:
//   • "customer" — storefront shopper; no dashboard access.
//   • "admin"    — dashboard access; cannot invite/manage other admins.
//   • "owner"    — dashboard access + may invite and manage admins (superset).

export type DashboardRole = "owner" | "admin"
export type UserRole = DashboardRole | "customer"

// Roles permitted to enter the admin dashboard.
const DASHBOARD_ROLES: readonly string[] = ["owner", "admin"]

// The single source of truth for "may this role use the dashboard?" — used by
// the proxy gate, the login page, and the AuthContext so they never drift apart.
export function canAccessDashboard(role: string | null | undefined): boolean {
  return !!role && DASHBOARD_ROLES.includes(role)
}

// Only an owner may invite or manage other admins.
export function canInviteAdmins(role: string | null | undefined): boolean {
  return role === "owner"
}

// Roles an owner may assign when inviting, ordered lowest → highest privilege.
export const ASSIGNABLE_ADMIN_ROLES: readonly DashboardRole[] = ["admin", "owner"]

// Default an invite to the least-privileged dashboard role.
export const DEFAULT_INVITE_ROLE: DashboardRole = "admin"

export function isAssignableAdminRole(role: string): role is DashboardRole {
  return (ASSIGNABLE_ADMIN_ROLES as readonly string[]).includes(role)
}
