import type { ReactNode } from "react";

// Marketing route group — public, no AuthGuard. The dashboard sits under
// `(dashboard)` with its own auth-gated layout; nothing inside this group
// renders until the visitor explicitly clicks Get Started → /login.
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-white text-slate-900">{children}</div>;
}
