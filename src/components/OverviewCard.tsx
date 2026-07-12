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
    <div className="flex h-full flex-col rounded-xl border border-slate-200/70 bg-white p-6">
      <h2 className="text-base font-semibold tracking-tight text-slate-900">
        Overview
      </h2>
      <div className="mt-3 flex flex-1 flex-col justify-evenly divide-y divide-slate-100">
        <Row
          icon={TrendingUp}
          iconClass="bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-100"
          label="Today Leads"
          value={todayLeads}
          delta={todayLeadsDelta}
        />
        <Row
          icon={Calendar}
          iconClass="bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-100"
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
    <div className={`flex items-center gap-3.5 ${divided ? "pt-3" : ""}`}>
      <span
        className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
      >
        <Icon size={20} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </p>
        <p className="mt-1 text-2xl font-semibold leading-none tracking-tight text-slate-900">
          {value}
        </p>
        <p className="mt-1.5 text-[11px] text-slate-400">{formatDelta(delta)}</p>
      </div>
    </div>
  );
}
