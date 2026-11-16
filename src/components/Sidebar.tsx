"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  BarChart3,
  Building2,
  Calendar,
  ChevronsUpDown,
  ClipboardList,
  DoorOpen,
  IndianRupee,
  LayoutDashboard,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
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

type NavSection = {
  title: string;
  items: NavItem[];
};

// Grouped navigation — mirrors the Selimor layout's sectioned menu.
const CLIENT_SECTIONS: NavSection[] = [
  {
    title: "Main Menu",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/patients", label: "Patients", icon: Stethoscope, module: "patients" },
      { href: "/walk-in", label: "Walk-in", icon: DoorOpen, module: "appointments" },
      { href: "/appointments", label: "Appointments", icon: Calendar, module: "appointments" },
    ],
  },
  {
    title: "Manage",
    items: [
      { href: "/leads", label: "Leads", icon: ClipboardList, module: "leads" },
      { href: "/feedbacks", label: "Feedbacks", icon: MessageSquare, module: "feedback" },
      { href: "/finances", label: "Finances", icon: IndianRupee, module: "payments" },
      { href: "/reports", label: "Reports", icon: BarChart3, adminOnly: true },
    ],
  },
  {
    title: "Other",
    items: [
      { href: "/staff", label: "Team", icon: Users, adminOnly: true },
      { href: "/activity", label: "Activity", icon: Activity, adminOnly: true },
      { href: "/profile", label: "Profile", icon: UserRound, adminOnly: true },
      { href: "/settings", label: "Settings", icon: Settings, adminOnly: true },
    ],
  },
];

const SUPER_ADMIN_SECTIONS: NavSection[] = [
  {
    title: "Main Menu",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
      { href: "/admin/clients", label: "Clients", icon: Building2 },
    ],
  },
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
  const [collapsed, setCollapsed] = useState(false);

  const initial = (user?.name || user?.email || "?").charAt(0).toUpperCase();
  const displayName = user?.name || user?.email?.split("@")[0] || "User";

  const sections =
    user?.role === "SUPER_ADMIN" ? SUPER_ADMIN_SECTIONS : CLIENT_SECTIONS;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200/80 bg-slate-50 transition-[transform,width] duration-200 md:sticky md:top-0 md:h-screen md:translate-x-0 ${
          collapsed ? "md:w-[76px]" : "md:w-64"
        } ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Logo + collapse toggle */}
        <div
          className={`flex px-4 py-4 ${
            collapsed
              ? "flex-row items-center justify-between md:flex-col md:gap-3"
              : "items-center justify-between"
          }`}
        >
          <Link
            href="/dashboard"
            onClick={onClose}
            className="flex items-center gap-2.5"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1f3d2b] text-sm font-bold text-white shadow-sm shadow-[#1f3d2b]/30">
              V
            </span>
            {!collapsed && (
              <span className="leading-tight">
                <span className="block text-sm font-semibold tracking-tight text-slate-900">
                  VGAII
                </span>
                <span className="block text-[11px] font-medium text-slate-400">
                  Practice CRM
                </span>
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setCollapsed(c => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden h-8 w-8 items-center justify-center rounded-lg border border-slate-200/70 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-700 md:flex"
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>

        {/* Sectioned navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {sections.map(section => {
            const items = section.items.filter(item => isVisible(item, user));
            if (items.length === 0) return null;
            return (
              <div key={section.title} className="mb-5">
                {collapsed ? (
                  <div className="mx-2 mb-2 mt-1 border-t border-slate-200/70 md:block" />
                ) : (
                  <p className="px-3 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    {section.title}
                  </p>
                )}
                <nav className="space-y-0.5">
                  {items.map(item => {
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
                        title={collapsed ? item.label : undefined}
                        className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                          collapsed ? "md:justify-center" : ""
                        } ${
                          active
                            ? "bg-white font-semibold text-green-700 shadow-sm ring-1 ring-slate-200/70"
                            : "font-medium text-slate-600 hover:bg-white/70 hover:text-slate-900"
                        }`}
                      >
                        <Icon
                          size={18}
                          strokeWidth={active ? 2.25 : 2}
                          className={
                            active
                              ? "shrink-0 text-green-600"
                              : "shrink-0 text-slate-400 transition-colors group-hover:text-slate-500"
                          }
                        />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            );
          })}
        </div>

        {/* User card */}
        {user && (
          <div className="p-3">
            <Link
              href="/account"
              onClick={onClose}
              title={collapsed ? displayName : undefined}
              className={`flex items-center gap-2.5 rounded-xl border border-slate-200/70 bg-white px-2.5 py-2 shadow-sm transition-colors hover:bg-slate-50 ${
                collapsed ? "md:justify-center md:px-0" : ""
              }`}
            >
              <span className="relative shrink-0">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-50 text-sm font-semibold text-green-700 ring-1 ring-inset ring-green-100">
                  {initial}
                </span>
                <span className="absolute -bottom-0 -right-0 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white" />
              </span>
              {!collapsed && (
                <>
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
                </>
              )}
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
