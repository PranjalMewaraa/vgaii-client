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
  "/finances": "Finances",
  "/reports": "Reports",
  "/activity": "Activity",
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

  // Match dynamic detail routes before falling back to the path-segment
  // heuristic — otherwise we'd render the cuid as the page title.
  const resolveTitle = (): string => {
    if (!pathname) return "Dashboard";
    if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
    if (/^\/patients\/[^/]+$/.test(pathname)) return "Patient Details";
    if (/^\/leads\/[^/]+$/.test(pathname)) return "Lead Details";
    return (
      pathname.split("/").pop()?.replace(/^\w/, c => c.toUpperCase()) ||
      "Dashboard"
    );
  };
  const title = resolveTitle();

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
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur-md md:gap-4 md:px-6 lg:px-8">
      <button
        type="button"
        onClick={onMenuClick}
        className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 md:hidden"
        aria-label="Open menu"
      >
        <Menu size={18} />
      </button>

      <div className="min-w-0 flex-1 md:flex-initial">
        <h1 className="truncate text-lg font-semibold tracking-tight text-slate-900">
          {title}
        </h1>
      </div>

      {user && user.role !== "SUPER_ADMIN" && (
        <div className="hidden flex-1 justify-center md:flex">
          <GlobalSearch />
        </div>
      )}

      {user && (
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <span className="mx-0.5 hidden h-6 w-px bg-slate-200 sm:block" />
          <Link
            href="/account"
            title="Account & password"
            className="flex items-center gap-2.5 rounded-xl px-1 py-1 transition-colors hover:bg-slate-100 sm:pr-2.5"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white shadow-sm shadow-blue-600/30">
              {initial}
            </span>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block max-w-[160px] truncate text-sm font-semibold text-slate-900">
                {displayName}
              </span>
              {roleLabel && (
                <span className="block text-[11px] font-medium text-slate-400">
                  {roleLabel}
                </span>
              )}
            </span>
          </Link>
          <button
            type="button"
            onClick={logout}
            title="Logout"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <LogOut size={15} />
            <span className="sr-only sm:not-sr-only">Logout</span>
          </button>
        </div>
      )}
    </header>
  );
}
