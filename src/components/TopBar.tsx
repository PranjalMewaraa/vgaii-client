"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import { clearStoredAuth, useStoredUser } from "@/lib/client-auth";
import GlobalSearch from "@/components/GlobalSearch";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/leads": "Leads",
  "/patients": "Patients",
  "/appointments": "Appointments",
  "/feedbacks": "Feedbacks",
  "/staff": "Team",
  "/profile": "Profile",
  "/settings": "Settings",
  "/admin/clients": "Clients",
};

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Platform",
  CLIENT_ADMIN: "Client",
  STAFF: "Staff",
};

export default function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useStoredUser();

  const title =
    PAGE_TITLES[pathname || "/"] ??
    (pathname?.split("/").pop()?.replace(/^\w/, c => c.toUpperCase()) ||
      "Dashboard");

  const logout = () => {
    // Fire-and-forget audit ping; don't block UI on it.
    const token = localStorage.getItem("token");
    if (token) {
      fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        keepalive: true,
      }).catch(() => {});
    }
    clearStoredAuth();
    router.replace("/login");
  };

  const initial = (user?.name || user?.email || "?").charAt(0).toUpperCase();
  const displayName = user?.name || user?.email?.split("@")[0] || "User";
  const roleLabel = user?.role ? ROLE_LABELS[user.role] ?? user.role : "";

  return (
    <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-slate-200 bg-white px-6 py-4 md:px-8">
      <button
        type="button"
        onClick={onMenuClick}
        className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 md:hidden"
        aria-label="Open menu"
      >
        <Menu size={18} />
      </button>

      <div className="hidden min-w-0 lg:block">
        <h1 className="truncate text-lg font-bold text-slate-900">{title}</h1>
      </div>

      {user && user.role !== "SUPER_ADMIN" && <GlobalSearch />}

      {user && (
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-sm text-slate-500 sm:block">
            {roleLabel}
          </span>
          <Link
            href="/account"
            title="Account & password"
            className="flex items-center gap-2 rounded-full p-0.5 transition hover:bg-slate-100"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
              {initial}
            </span>
            <span className="hidden pr-2 text-sm font-medium text-slate-700 sm:block">
              {displayName}
            </span>
          </Link>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      )}
    </header>
  );
}
