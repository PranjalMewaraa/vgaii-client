import type { ReactNode } from "react";
import AuthGuard from "@/components/AuthGuard";
import AppShell from "@/components/AppShell";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  );
}
