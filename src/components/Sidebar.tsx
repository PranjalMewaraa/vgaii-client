"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Building2,
  Calendar,
  ClipboardList,
  LayoutDashboard,
  MessageSquare,
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
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: ClipboardList, module: "leads" },
  { href: "/patients", label: "Patients", icon: Stethoscope, module: "patients" },
  { href: "/appointments", label: "Appointments", icon: Calendar, module: "appointments" },
  { href: "/feedbacks", label: "Feedbacks", icon: MessageSquare, module: "feedback" },
  { href: "/staff", label: "Team", icon: Users, adminOnly: true },
  { href: "/activity", label: "Activity", icon: Activity, adminOnly: true },
  { href: "/profile", label: "Profile", icon: UserRound, adminOnly: true },
  { href: "/settings", label: "Settings", icon: Settings, adminOnly: true },
];

const SUPER_ADMIN_NAV: NavItem[] = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
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

  const sectionLabel =
    user?.role === "SUPER_ADMIN" ? "PLATFORM" : "CLIENT";

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-slate-200 bg-white transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
            V
          </div>
          <span className="text-sm font-bold tracking-wide text-slate-900">
            VGAII-CRM
          </span>
        </div>

        <div className="flex-1 px-3 py-5">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {sectionLabel}
          </p>

          <nav className="space-y-1">
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
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                      active
                        ? "bg-indigo-50 font-semibold text-indigo-700"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Icon
                      size={18}
                      strokeWidth={active ? 2.25 : 2}
                      className={active ? "text-indigo-600" : "text-slate-400"}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
          </nav>
        </div>
      </aside>
    </>
  );
}
