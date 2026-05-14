"use client";

import Link from "next/link";
import { BarChart3, CalendarPlus, UserPlus, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Action = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const ACTIONS: Action[] = [
  { href: "/leads?add=1", label: "Add Lead", icon: UserPlus },
  { href: "/patients?add=1", label: "Add Patient", icon: Users },
  { href: "/appointments?add=1", label: "New Appointment", icon: CalendarPlus },
  { href: "/reports", label: "View Reports", icon: BarChart3 },
];

export default function QuickActionsCard() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <h2 className="text-base font-semibold text-slate-900">Quick Actions</h2>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {ACTIONS.map(a => {
          const Icon = a.icon;
          return (
            <Link
              key={a.href}
              href={a.href}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Icon size={14} className="text-slate-500" />
              <span>{a.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
