"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";

// Selimor-style metric strip: a horizontal ticker of headline numbers
// separated by dotted dividers, each with an optional up/down delta pill.
// Scrolls horizontally on narrow screens rather than wrapping.

type Props = {
  leadsCount: number;
  todayLeads: number;
  yesterdayLeads: number;
  patientsCount: number;
  appointments: number;
  yesterdayUpcomingAppointments: number;
  openFeedback: number;
};

const nf = (n: number) => n.toLocaleString();

export default function DashboardMetricStrip({
  leadsCount,
  todayLeads,
  yesterdayLeads,
  patientsCount,
  appointments,
  yesterdayUpcomingAppointments,
  openFeedback,
}: Props) {
  return (
    <div className="rounded-xl border border-slate-200/70 bg-white p-6">
      <p className="mb-4 text-base font-semibold tracking-tight text-slate-900">
        Performance overview
      </p>
      <div className="overflow-x-auto">
        <div className="flex min-w-max divide-x divide-dashed divide-slate-200">
          <Metric label="Total Leads" value={nf(leadsCount)} />
          <Metric
            label="New Today"
            value={nf(todayLeads)}
            delta={todayLeads - yesterdayLeads}
          />
          <Metric label="Patients" value={nf(patientsCount)} />
          <Metric
            label="Upcoming Appts"
            value={nf(appointments)}
            delta={appointments - yesterdayUpcomingAppointments}
          />
          <Metric label="Open Feedback" value={nf(openFeedback)} />
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  delta,
}: {
  label: string;
  value: string;
  delta?: number;
}) {
  return (
    <div className="flex min-w-[150px] flex-col gap-2 px-6 first:pl-0 last:pr-0">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
          {value}
        </span>
        {typeof delta === "number" && delta !== 0 && <DeltaPill delta={delta} />}
      </div>
    </div>
  );
}

function DeltaPill({ delta }: { delta: number }) {
  const up = delta > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        up ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
      }`}
    >
      {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {up ? "+" : ""}
      {delta}
    </span>
  );
}
