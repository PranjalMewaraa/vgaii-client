"use client";

// Floating "+" in the bottom-right corner. Tap to fan out quick-add chips
// (Lead, Patient, Appointment, Payment). Each chip is a Link to a deep-link
// URL that opens the right modal on mount.
//
// Hidden when:
//  - not logged in (no token)
//  - the user is SUPER_ADMIN (platform view — no clinic context)
//  - the onboarding tour is active
//  - STAFF with zero assigned modules (nothing actionable)
//
// For STAFF, only chips whose module is in assignedModules are shown.
// CLIENT_ADMIN always sees all chips.
//
// Closes on: Esc, backdrop click, or after navigating to a chip.

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarPlus,
  Plus,
  UserPlus,
  Users,
  Wallet,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTour } from "@/components/tour/TourContext";
import { useStoredUser } from "@/lib/client-auth";

type FabAction = {
  href: string;
  label: string;
  icon: LucideIcon;
  iconClass: string;
  module: string;
};

const ACTIONS: FabAction[] = [
  {
    href: "/leads?add=1",
    label: "Add lead",
    icon: UserPlus,
    iconClass: "bg-indigo-50 text-indigo-600 ring-1 ring-inset ring-indigo-100",
    module: "leads",
  },
  {
    href: "/patients?add=1",
    label: "Add patient",
    icon: Users,
    iconClass: "bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-100",
    module: "patients",
  },
  {
    href: "/appointments?add=1",
    label: "New appointment",
    icon: CalendarPlus,
    iconClass: "bg-sky-50 text-sky-600 ring-1 ring-inset ring-sky-100",
    module: "appointments",
  },
  {
    href: "/finances?tab=payment&new=1",
    label: "Record payment",
    icon: Wallet,
    iconClass: "bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-100",
    module: "payments",
  },
];

export default function QuickActionFab() {
  const [open, setOpen] = useState(false);
  const { active: tourActive } = useTour();
  const pathname = usePathname();
  const user = useStoredUser();

  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    if (open) setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const hasToken =
    typeof window !== "undefined" && !!localStorage.getItem("token");

  // Hide when not signed in or during the tour
  if (!hasToken || tourActive) return null;

  // Only CLIENT_ADMIN and STAFF have a clinic context — SUPER_ADMIN operates
  // at the platform level and has no need for per-clinic quick actions.
  if (!user || user.role === "SUPER_ADMIN") return null;

  // CLIENT_ADMIN sees every action. STAFF sees only actions whose module is
  // in their assignedModules list.
  const visibleActions =
    user.role === "STAFF"
      ? ACTIONS.filter(a =>
          (user.assignedModules ?? []).includes(a.module),
        )
      : ACTIONS;

  // Nothing to offer — hide completely (e.g. STAFF with no modules yet)
  if (visibleActions.length === 0) return null;

  return (
    <>
      {/* Transparent backdrop to catch click-outside */}
      {open && (
        <button
          type="button"
          aria-label="Close quick actions"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 cursor-default bg-transparent"
        />
      )}

      <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
        {open && (
          <div className="flex flex-col items-end gap-2">
            {visibleActions.map((a, i) => {
              const Icon = a.icon;
              return (
                <Link
                  key={a.href}
                  href={a.href}
                  onClick={() => setOpen(false)}
                  style={{
                    animation: "fab-chip-in 160ms ease-out backwards",
                    animationDelay: `${i * 30}ms`,
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-lg ring-1 ring-slate-200 transition-colors hover:bg-slate-50"
                >
                  <span>{a.label}</span>
                  <span
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${a.iconClass}`}
                  >
                    <Icon size={14} />
                  </span>
                </Link>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={open ? "Close quick actions" : "Open quick actions"}
          className={`inline-flex h-14 w-14 items-center justify-center rounded-full text-white shadow-xl transition focus:outline-none focus:ring-4 focus:ring-indigo-200 ${
            open
              ? "rotate-90 bg-slate-700 hover:bg-slate-800"
              : "bg-indigo-600 hover:bg-indigo-700"
          }`}
          style={{ transitionProperty: "transform, background-color" }}
        >
          {open ? <X size={22} /> : <Plus size={26} />}
        </button>
      </div>

      <style jsx global>{`
        @keyframes fab-chip-in {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </>
  );
}
