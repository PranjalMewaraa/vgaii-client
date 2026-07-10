"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Gift, LogOut, Menu } from "lucide-react";
import { clearStoredAuth, useStoredUser } from "@/lib/client-auth";
import GlobalSearch from "@/components/GlobalSearch";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Platform",
  CLIENT_ADMIN: "Client",
  STAFF: "Staff",
};

export default function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const router = useRouter();
  const user = useStoredUser();

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

      {user && user.role !== "SUPER_ADMIN" && (
        <div className="hidden flex-1 md:flex">
          <GlobalSearch />
        </div>
      )}

      {user && (
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 sm:flex">
            <Link
              href="/settings"
              title="What's new"
              aria-label="What's new"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-700"
            >
              <Gift size={17} />
            </Link>
            <Link
              href="/activity"
              title="Notifications"
              aria-label="Notifications"
              className="relative flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-700"
            >
              <Bell size={17} />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-green-500 ring-2 ring-white" />
            </Link>
          </div>
          <span className="mx-0.5 hidden h-6 w-px bg-slate-200 sm:block" />
          <Link
            href="/account"
            title="Account & password"
            className="flex items-center gap-2.5 rounded-xl px-1 py-1 transition-colors hover:bg-slate-100 sm:pr-2.5"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-sm font-semibold text-green-700 ring-1 ring-inset ring-green-200">
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
