// Minimal chrome for public auth pages (/login, /reset-password). No sidebar,
// no admin navigation, no dashboard data — each page renders its own full-screen
// card. This group is intentionally separate from (dashboard) so unauthenticated
// or recovery-session visitors never see the admin shell.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
