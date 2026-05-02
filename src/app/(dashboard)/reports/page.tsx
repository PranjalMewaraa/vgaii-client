"use client";

import { useEffect, useMemo, useState } from "react";
import RoleGuard from "@/components/RoleGuard";

type Funnel = {
  new: number;
  contacted: number;
  qualified: number;
  appointment_booked: number;
  visited: number;
};

type SourceRow = {
  source: string;
  total: number;
  booked: number;
  visited: number;
  lost: number;
  conversionRate: number;
};

type ReportData = {
  range: { from: string | null; to: string | null };
  funnel: Funnel;
  lost: number;
  totalLeads: number;
  sources: SourceRow[];
  appointments: {
    total: number;
    scheduled: number;
    completed: number;
    no_show: number;
    cancelled: number;
    noShowRate: number;
  };
  ratings: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
    average: number;
    count: number;
  };
  timeSeries: Array<{ date: string; leads: number; appointments: number }>;
};

type Preset = "all" | "7d" | "30d" | "90d" | "ytd" | "custom";

const PRESET_LABELS: Record<Preset, string> = {
  all: "All time",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  ytd: "Year to date",
  custom: "Custom",
};

const FUNNEL_STAGES: Array<{ key: keyof Funnel; label: string; color: string }> = [
  { key: "new", label: "New", color: "bg-slate-500" },
  { key: "contacted", label: "Contacted", color: "bg-sky-500" },
  { key: "qualified", label: "Qualified", color: "bg-indigo-500" },
  { key: "appointment_booked", label: "Booked", color: "bg-violet-500" },
  { key: "visited", label: "Visited", color: "bg-emerald-500" },
];

const computeRange = (
  preset: Preset,
  fromCustom: string,
  toCustom: string,
): { from: string | null; to: string | null } => {
  const now = new Date();
  if (preset === "all") {
    return { from: null, to: null };
  }
  if (preset === "custom") {
    return {
      from: fromCustom ? new Date(fromCustom).toISOString() : null,
      to: toCustom ? new Date(toCustom).toISOString() : null,
    };
  }
  const from = new Date(now);
  if (preset === "7d") from.setDate(from.getDate() - 7);
  else if (preset === "30d") from.setDate(from.getDate() - 30);
  else if (preset === "90d") from.setDate(from.getDate() - 90);
  else if (preset === "ytd") {
    from.setMonth(0, 1);
    from.setHours(0, 0, 0, 0);
  }
  return { from: from.toISOString(), to: now.toISOString() };
};

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${
    typeof window !== "undefined" ? localStorage.getItem("token") : ""
  }`,
});

const pct = (n: number, d: number) =>
  d === 0 ? "—" : `${Math.round((n / d) * 100)}%`;

export default function ReportsPage() {
  return (
    <RoleGuard allow={["CLIENT_ADMIN"]}>
      <ReportsPageInner />
    </RoleGuard>
  );
}

function ReportsPageInner() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const [preset, setPreset] = useState<Preset>("all");
  const [fromCustom, setFromCustom] = useState("");
  const [toCustom, setToCustom] = useState("");

  const range = useMemo(
    () => computeRange(preset, fromCustom, toCustom),
    [preset, fromCustom, toCustom],
  );

  useEffect(() => {
    const url = new URL("/api/reports/overview", window.location.origin);
    if (range.from) url.searchParams.set("from", range.from);
    if (range.to) url.searchParams.set("to", range.to);
    fetch(url.toString(), { headers: authHeaders() })
      .then(res => res.json())
      .then((d: ReportData) => setData(d))
      .finally(() => setLoading(false));
  }, [range.from, range.to]);

  if (loading && !data) {
    return <p className="text-sm text-slate-500">Loading…</p>;
  }
  if (!data) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Failed to load report.
      </p>
    );
  }

  const { funnel, lost, totalLeads, sources, appointments, ratings, timeSeries } =
    data;

  // Funnel max is leads that entered the top of the funnel. Bars are scaled
  // against `funnel.new` so each step visually shows drop-off.
  const funnelMax = Math.max(funnel.new, 1);

  // For the time series chart, scale by max combined value across days.
  const seriesMax = Math.max(
    1,
    ...timeSeries.map(d => Math.max(d.leads, d.appointments)),
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-sm text-slate-500">
            Funnel performance, source attribution, and clinical outcomes for
            the selected period.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(PRESET_LABELS) as Preset[])
            .filter(p => p !== "custom")
            .map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setPreset(p)}
                className={`rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wider transition ${
                  preset === p
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {PRESET_LABELS[p]}
              </button>
            ))}
          <button
            type="button"
            onClick={() => setPreset("custom")}
            className={`rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wider transition ${
              preset === "custom"
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Custom
          </button>
        </div>
      </header>

      {preset === "custom" && (
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              From
            </span>
            <input
              type="date"
              value={fromCustom}
              onChange={e => setFromCustom(e.target.value)}
              className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              To
            </span>
            <input
              type="date"
              value={toCustom}
              onChange={e => setToCustom(e.target.value)}
              className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
        </div>
      )}

      {/* Top-line stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Leads in period"
          value={totalLeads}
          sublabel={`${lost} lost`}
        />
        <Stat
          label="Conversion to visited"
          value={pct(funnel.visited, totalLeads)}
          sublabel={`${funnel.visited} of ${totalLeads}`}
        />
        <Stat
          label="No-show rate"
          value={
            appointments.completed + appointments.no_show > 0
              ? `${Math.round(appointments.noShowRate * 100)}%`
              : "—"
          }
          sublabel={`${appointments.no_show} of ${
            appointments.completed + appointments.no_show
          } resolved`}
          tone={
            appointments.noShowRate > 0.2
              ? "warn"
              : appointments.noShowRate > 0
                ? undefined
                : undefined
          }
        />
        <Stat
          label="Avg patient rating"
          value={
            ratings.count > 0 ? `⭐ ${ratings.average.toFixed(1)}/5` : "—"
          }
          sublabel={`${ratings.count} ratings`}
        />
      </div>

      {/* Funnel */}
      <section className="rounded-xl border border-slate-200 bg-white px-6 py-5">
        <h2 className="text-base font-semibold text-slate-900">Funnel</h2>
        <p className="text-xs text-slate-500">
          Each stage shows leads that reached it or moved past. {lost} also
          flagged as lost (excluded from drop-off).
        </p>
        <div className="mt-4 space-y-3">
          {FUNNEL_STAGES.map((stage, i) => {
            const count = funnel[stage.key];
            const ratio = count / funnelMax;
            const prevCount = i > 0 ? funnel[FUNNEL_STAGES[i - 1].key] : count;
            const dropOff = prevCount - count;
            return (
              <div key={stage.key}>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold uppercase tracking-wider text-slate-700">
                    {stage.label}
                  </span>
                  <span>
                    {count}
                    {i > 0 && prevCount > 0 && (
                      <span className="ml-2 text-slate-400">
                        {pct(count, prevCount)} from previous
                        {dropOff > 0 && ` · −${dropOff}`}
                      </span>
                    )}
                  </span>
                </div>
                <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${stage.color}`}
                    style={{ width: `${Math.max(ratio * 100, count > 0 ? 4 : 0)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Sources */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            Source attribution
          </h2>
          <p className="text-xs text-slate-500">
            Where leads came from in this period and how each source converts.
          </p>
        </div>
        {sources.length === 0 ? (
          <p className="px-6 py-6 text-sm text-slate-500">
            No leads captured in this range.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-3 text-left">Source</th>
                  <th className="px-6 py-3 text-right">Leads</th>
                  <th className="px-6 py-3 text-right">Booked</th>
                  <th className="px-6 py-3 text-right">Visited</th>
                  <th className="px-6 py-3 text-right">Lost</th>
                  <th className="px-6 py-3 text-right">Conversion</th>
                </tr>
              </thead>
              <tbody>
                {sources.map(s => (
                  <tr key={s.source} className="border-t border-slate-200">
                    <td className="px-6 py-3 font-medium text-slate-900">
                      {s.source}
                    </td>
                    <td className="px-6 py-3 text-right text-slate-700">
                      {s.total}
                    </td>
                    <td className="px-6 py-3 text-right text-slate-700">
                      {s.booked}
                    </td>
                    <td className="px-6 py-3 text-right text-emerald-700">
                      {s.visited}
                    </td>
                    <td className="px-6 py-3 text-right text-slate-500">
                      {s.lost}
                    </td>
                    <td className="px-6 py-3 text-right font-semibold text-indigo-700">
                      {pct(s.visited, s.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Appointments + Ratings */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white px-6 py-5">
          <h2 className="text-base font-semibold text-slate-900">
            Appointment outcomes
          </h2>
          <p className="text-xs text-slate-500">
            All appointments dated in this period, by current status.
          </p>
          <div className="mt-4 space-y-2">
            <ApptRow label="Scheduled" count={appointments.scheduled} total={appointments.total} color="bg-sky-500" />
            <ApptRow label="Visited" count={appointments.completed} total={appointments.total} color="bg-emerald-500" />
            <ApptRow label="No-show" count={appointments.no_show} total={appointments.total} color="bg-red-500" />
            <ApptRow label="Cancelled" count={appointments.cancelled} total={appointments.total} color="bg-slate-400" />
          </div>
          {appointments.completed + appointments.no_show > 0 && (
            <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Of {appointments.completed + appointments.no_show} appointments
              that resolved,{" "}
              <span className="font-semibold text-slate-900">
                {Math.round(appointments.noShowRate * 100)}%
              </span>{" "}
              ended as no-show.
            </p>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white px-6 py-5">
          <h2 className="text-base font-semibold text-slate-900">
            Patient ratings
          </h2>
          <p className="text-xs text-slate-500">
            Outcome ratings collected from leads in this period (5 = best).
          </p>
          {ratings.count === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              No ratings collected yet.
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {([5, 4, 3, 2, 1] as const).map(score => {
                const count = ratings[score];
                const ratio = ratings.count > 0 ? count / ratings.count : 0;
                return (
                  <div key={score}>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">
                        {"⭐".repeat(score)}
                      </span>
                      <span>
                        {count} · {pct(count, ratings.count)}
                      </span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-amber-400"
                        style={{ width: `${Math.max(ratio * 100, count > 0 ? 4 : 0)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Time series */}
      <section className="rounded-xl border border-slate-200 bg-white px-6 py-5">
        <h2 className="text-base font-semibold text-slate-900">Daily volume</h2>
        <p className="text-xs text-slate-500">
          Leads captured and appointments dated for each day in the range.
        </p>
        <div className="mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
          <Legend swatch="bg-indigo-500" label="Leads" />
          <span />
          <Legend swatch="bg-emerald-500" label="Appointments" />
          <span />
        </div>
        <div className="mt-4 flex items-end gap-1 overflow-x-auto pb-2">
          {timeSeries.map(d => {
            const leadsHeight = (d.leads / seriesMax) * 100;
            const apptHeight = (d.appointments / seriesMax) * 100;
            return (
              <div
                key={d.date}
                title={`${d.date} · ${d.leads} leads · ${d.appointments} appts`}
                className="flex shrink-0 flex-col items-center gap-0.5"
              >
                <div className="flex h-32 items-end gap-0.5">
                  <div
                    className="w-1.5 rounded-t bg-indigo-500"
                    style={{ height: `${Math.max(leadsHeight, d.leads > 0 ? 4 : 0)}%` }}
                  />
                  <div
                    className="w-1.5 rounded-t bg-emerald-500"
                    style={{
                      height: `${Math.max(apptHeight, d.appointments > 0 ? 4 : 0)}%`,
                    }}
                  />
                </div>
                <span className="text-[8px] text-slate-400">
                  {d.date.slice(5)}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  sublabel,
  tone,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  tone?: "warn";
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p
        className={`mt-1 text-2xl font-bold ${
          tone === "warn" ? "text-amber-600" : "text-slate-900"
        }`}
      >
        {value}
      </p>
      {sublabel && (
        <p className="text-xs text-slate-500">{sublabel}</p>
      )}
    </div>
  );
}

function ApptRow({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const ratio = total > 0 ? count / total : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span className="font-semibold text-slate-700">{label}</span>
        <span>
          {count} · {pct(count, total)}
        </span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.max(ratio * 100, count > 0 ? 4 : 0)}%` }}
        />
      </div>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-2 w-2 rounded-sm ${swatch}`} />
      <span className="text-slate-600">{label}</span>
    </span>
  );
}
