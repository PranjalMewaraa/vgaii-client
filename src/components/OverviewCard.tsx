"use client";

import { Calendar, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Props = {
  todayLeads: number;
  todayLeadsDelta: number;
  upcomingAppts: number;
  upcomingApptsDelta: number;
};

// Two-metric card with a divider, mirroring the dashboard mockup. Deltas
// are rendered with a sign so positive numbers stand out without colour
// coding (matches the mockup's neutral grey caption).
const formatDelta = (n: number): string => {
  if (n === 0) return "— vs yesterday";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n} vs yesterday`;
};

export default function OverviewCard({
  todayLeads,
  todayLeadsDelta,
  upcomingAppts,
  upcomingApptsDelta,
}: Props) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <h2 className="text-base font-semibold text-slate-900">Overview</h2>
      <div className="mt-3 space-y-3 divide-y divide-slate-100">
        <Row
          icon={TrendingUp}
          iconClass="bg-emerald-100 text-emerald-600"
          label="Today Leads"
          value={todayLeads}
          delta={todayLeadsDelta}
        />
        <Row
          icon={Calendar}
          iconClass="bg-amber-100 text-amber-600"
          label="Upcoming Appts"
          value={upcomingAppts}
          delta={upcomingApptsDelta}
          divided
        />
      </div>
    </div>
  );
}

function Row({
  icon: Icon,
  iconClass,
  label,
  value,
  delta,
  divided,
}: {
  icon: LucideIcon;
  iconClass: string;
  label: string;
  value: number;
  delta: number;
  divided?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 ${divided ? "pt-3" : ""}`}>
      <span
        className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${iconClass}`}
      >
        <Icon size={20} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </p>
        <p className="mt-0.5 text-2xl font-bold leading-tight text-slate-900">
          {value}
        </p>
        <p className="mt-0.5 text-[11px] text-slate-500">{formatDelta(delta)}</p>
      </div>
    </div>
  );
}
