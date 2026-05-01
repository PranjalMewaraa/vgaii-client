"use client";

import { type ReactNode } from "react";
import { useStoredUser } from "@/lib/client-auth";
import NotFoundView from "@/components/NotFoundView";
import type { AssignableModule } from "@/lib/rbac";

type Role = "SUPER_ADMIN" | "CLIENT_ADMIN" | "STAFF";

export default function RoleGuard({
  children,
  allow,
  module: requiredModule,
}: {
  children: ReactNode;
  allow?: Role[];
  module?: AssignableModule;
}) {
  const user = useStoredUser();

  // useSyncExternalStore returns null on SSR snapshot; once hydrated, it has
  // the localStorage user. While null, render nothing — the AuthGuard above
  // already gates the unauthenticated case.
  if (!user || !user.role) return null;

  // SUPER_ADMIN bypasses everything.
  if (user.role === "SUPER_ADMIN") return <>{children}</>;

  // Role allow-list (e.g. CLIENT_ADMIN-only routes).
  if (allow && !allow.includes(user.role)) {
    return <NotFoundView mode="forbidden" />;
  }

  // Module gate. CLIENT_ADMIN bypasses module checks (matches server-side
  // behavior in lib/rbac.ts).
  if (requiredModule) {
    if (
      user.role !== "CLIENT_ADMIN" &&
      !user.assignedModules?.includes(requiredModule)
    ) {
      return <NotFoundView mode="forbidden" />;
    }
  }

  return <>{children}</>;
}
