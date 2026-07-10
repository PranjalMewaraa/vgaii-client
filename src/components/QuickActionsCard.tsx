"use client";

import Link from "next/link";
import { BarChart3, CalendarPlus, UserPlus, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Action = {
  href: string;
  label: string;
  icon: LucideIcon;
  // Tailwind classes for the icon's circular swatch — keeps each tile
  // visually distinct without painting the whole button.
  iconClass: string;
  hoverClass: string;
};

const ACTIONS: Action[] = [
  {
    href: "/leads?add=1",
    label: "Add Lead",
    icon: UserPlus,
    iconClass: "bg-blue-50 text-blue-600 ring-1 ring-inset ring-blue-100",
    hoverClass: "hover:border-blue-200 hover:bg-blue-50",
  },
  {
    href: "/patients?add=1",
    label: "Add Patient",
    icon: Users,
    iconClass: "bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-100",
    hoverClass: "hover:border-emerald-200 hover:bg-emerald-50",
  },
  {
    href: "/appointments?add=1",
    label: "New Appointment",
    icon: CalendarPlus,
    iconClass: "bg-sky-50 text-sky-600 ring-1 ring-inset ring-sky-100",
    hoverClass: "hover:border-sky-200 hover:bg-sky-50",
  },
  {
    href: "/reports",
    label: "View Reports",
    icon: BarChart3,
    iconClass: "bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-100",
    hoverClass: "hover:border-amber-200 hover:bg-amber-50",
  },
];

export default function QuickActionsCard() {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold tracking-tight text-slate-900">Quick Actions</h2>
      <div className="mt-3 grid flex-1 grid-cols-2 gap-2">
        {ACTIONS.map(a => {
          const Icon = a.icon;
          return (
            <Link
              key={a.href}
              href={a.href}
              className={`flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-4 text-sm font-medium text-slate-700 shadow-sm transition ${a.hoverClass}`}
            >
              <span
                className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${a.iconClass}`}
              >
                <Icon size={16} />
              </span>
              <span>{a.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
