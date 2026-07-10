"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import {
  Activity,
  BarChart3,
  Building2,
  Calendar,
  ChevronsUpDown,
  ClipboardList,
  IndianRupee,
  LayoutDashboard,
  MessageSquare,
  Plus,
  Settings,
  Stethoscope,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useStoredUser, type StoredUser } from "@/lib/client-auth";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  module?: string;
  adminOnly?: boolean;
};

const CLIENT_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: ClipboardList, module: "leads" },
  { href: "/patients", label: "Patients", icon: Stethoscope, module: "patients" },
  { href: "/appointments", label: "Appointments", icon: Calendar, module: "appointments" },
  { href: "/feedbacks", label: "Feedbacks", icon: MessageSquare, module: "feedback" },
  { href: "/finances", label: "Finances", icon: IndianRupee, module: "payments" },
  { href: "/reports", label: "Reports", icon: BarChart3, adminOnly: true },
  { href: "/staff", label: "Team", icon: Users, adminOnly: true },
  { href: "/activity", label: "Activity", icon: Activity, adminOnly: true },
  { href: "/profile", label: "Profile", icon: UserRound, adminOnly: true },
  { href: "/settings", label: "Settings", icon: Settings, adminOnly: true },
];

const SUPER_ADMIN_NAV: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/clients", label: "Clients", icon: Building2 },
];

const isVisible = (item: NavItem, user: StoredUser | null) => {
  if (!user) return !item.adminOnly;
  if (item.adminOnly) return user.role === "CLIENT_ADMIN";
  if (user.role === "SUPER_ADMIN" || user.role === "CLIENT_ADMIN") return true;
  if (!item.module) return true;
  return user.assignedModules?.includes(item.module) ?? false;
};

export default function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const user = useStoredUser();

  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const sectionLabel = isSuperAdmin ? "PLATFORM" : "CLIENT";

  const initial = (user?.name || user?.email || "?").charAt(0).toUpperCase();
  const displayName = user?.name || user?.email?.split("@")[0] || "User";

  // Only client admins reliably have a dashboard payload (which carries the
  // Google business name). Everyone else falls back to a neutral label — we
  // never fabricate a clinic name.
  const { data: dash } = useSWR<{ businessInfo?: { name?: string } | null }>(
    user?.role === "CLIENT_ADMIN" ? "/api/dashboard" : null,
  );

  const workspaceName = isSuperAdmin
    ? "Platform"
    : dash?.businessInfo?.name || "Your workspace";
  const workspaceSub = isSuperAdmin ? "All clients" : "Main branch";
  const workspaceHref = isSuperAdmin ? "/admin/clients" : "/settings";

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200/80 bg-white transition-transform duration-200 md:sticky md:top-0 md:h-screen md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2.5 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white shadow-sm shadow-blue-600/30">
            V
          </div>
          <div className="leading-tight">
            <span className="block text-sm font-semibold tracking-tight text-slate-900">
              VGAII
            </span>
            <span className="block text-[11px] font-medium text-slate-400">
              Practice CRM
            </span>
          </div>
        </div>

        <div className="px-3 pb-1">
          <Link
            href={workspaceHref}
            onClick={onClose}
            title="Workspace settings"
            className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-2.5 py-2 shadow-sm transition-colors hover:bg-slate-50"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 ring-1 ring-inset ring-blue-100">
              {isSuperAdmin ? <Building2 size={18} /> : <Plus size={18} />}
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-sm font-semibold text-slate-900">
                {workspaceName}
              </span>
              <span className="block truncate text-[11px] font-medium text-slate-400">
                {workspaceSub}
              </span>
            </span>
            <ChevronsUpDown size={15} className="shrink-0 text-slate-300" />
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2">
          <p className="px-3 pb-2 pt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            {sectionLabel}
          </p>

          <nav className="space-y-0.5">
            {(user?.role === "SUPER_ADMIN" ? SUPER_ADMIN_NAV : CLIENT_NAV)
              .filter(item => isVisible(item, user))
              .map(item => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname?.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    aria-current={active ? "page" : undefined}
                    className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "bg-blue-50 text-blue-700"
                        : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
                    }`}
                  >
                    {active && (
                      <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-blue-600" />
                    )}
                    <Icon
                      size={18}
                      strokeWidth={active ? 2.25 : 2}
                      className={
                        active
                          ? "text-blue-600"
                          : "text-slate-400 transition-colors group-hover:text-slate-500"
                      }
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
          </nav>
        </div>

        {user && (
          <div className="border-t border-slate-100 p-3">
            <Link
              href="/account"
              onClick={onClose}
              className="flex items-center gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-slate-100/70"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700 ring-1 ring-inset ring-blue-100">
                {initial}
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-sm font-semibold text-slate-900">
                  {displayName}
                </span>
                {user.email && (
                  <span className="block truncate text-[11px] text-slate-400">
                    {user.email}
                  </span>
                )}
              </span>
              <ChevronsUpDown size={15} className="shrink-0 text-slate-300" />
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
