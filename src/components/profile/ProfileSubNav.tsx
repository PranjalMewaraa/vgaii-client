"use client";

// Tab strip rendered at the top of /profile and /profile/template so
// both pages feel like sides of the same workflow. We use Next's
// <Link> (full route navigation) rather than tab-state because each
// side has its own fetch + save lifecycle — sharing state across both
// would mean lifting it into a layout, which is overkill for two
// pages.

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS: Array<{ href: string; label: string; description: string }> = [
  {
    href: "/profile",
    label: "Content",
    description: "Hero, about, services, contact details",
  },
  {
    href: "/profile/template",
    label: "Template",
    description: "Pick the visual style of your public page",
  },
];

export default function ProfileSubNav() {
  const pathname = usePathname();

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex border-b border-slate-200">
        {TABS.map(t => {
          // Exact-match: /profile/template should NOT mark /profile as
          // active, and vice versa.
          const isActive = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-1 flex-col items-start gap-0.5 border-b-2 px-5 py-3.5 text-sm transition-colors ${
                isActive
                  ? "border-blue-600 bg-blue-50/40 text-blue-700"
                  : "border-transparent text-slate-500 hover:bg-slate-50/70 hover:text-slate-700"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="font-semibold tracking-tight">{t.label}</span>
              <span className="text-[11px] font-normal text-slate-400">
                {t.description}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
