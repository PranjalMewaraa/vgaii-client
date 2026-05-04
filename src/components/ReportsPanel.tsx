"use client";

import { useEffect, useMemo, useState } from "react";

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
  googleRatings: {
    rating: number | null;
    totalReviews: number | null;
    distribution: { 1: number; 2: number; 3: number; 4: number; 5: number } | null;
    count: number;
  } | null;
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

export default function ReportsPanel() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const [preset, setPreset] = useState<Preset>("all");
  const [fromCustom, setFromCustom] = useState("");
  const [toCustom, setToCustom] = useState("");
  const [ratingsSource, setRatingsSource] = useState<"internal" | "google">(
    "internal",
  );

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
    return <p className="text-sm text-slate-500">Loading reports…</p>;
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

  const funnelMax = Math.max(funnel.new, 1);
  const seriesMax = Math.max(
    1,
    ...timeSeries.map(d => Math.max(d.leads, d.appointments)),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Reports</h2>
          <p className="text-xs text-slate-500">
            Funnel, source attribution, and clinical outcomes for the
            selected period.
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
      </div>

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
          tone={appointments.noShowRate > 0.2 ? "warn" : undefined}
        />
        <Stat
          label="Avg patient rating"
          value={
            ratings.count > 0 ? `⭐ ${ratings.average.toFixed(1)}/5` : "—"
          }
          sublabel={`${ratings.count} ratings`}
        />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white px-6 py-5">
        <h3 className="text-base font-semibold text-slate-900">Funnel</h3>
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

      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-base font-semibold text-slate-900">
            Source attribution
          </h3>
          <p className="text-xs text-slate-500">
            Where leads came from and how each source converts.
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

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white px-6 py-5">
          <h3 className="text-base font-semibold text-slate-900">
            Appointment outcomes
          </h3>
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
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Patient ratings
              </h3>
              <p className="text-xs text-slate-500">
                {ratingsSource === "internal"
                  ? "Outcome ratings collected from leads in this period (5 = best)."
                  : "Star distribution from your Google Business listing (all-time)."}
              </p>
            </div>
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setRatingsSource("internal")}
                className={`rounded-md px-2 py-1 font-medium uppercase tracking-wider transition ${
                  ratingsSource === "internal"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                Internal
              </button>
              <button
                type="button"
                onClick={() => setRatingsSource("google")}
                className={`rounded-md px-2 py-1 font-medium uppercase tracking-wider transition ${
                  ratingsSource === "google"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                Google
              </button>
            </div>
          </div>
          {ratingsSource === "internal" ? (
            <RatingsHistogram
              empty={ratings.count === 0}
              emptyLabel="No ratings collected yet."
              count={ratings.count}
              average={ratings.average}
              buckets={{
                1: ratings[1],
                2: ratings[2],
                3: ratings[3],
                4: ratings[4],
                5: ratings[5],
              }}
            />
          ) : !data.googleRatings ? (
            <p className="mt-4 text-sm text-slate-500">
              Google reviews not connected. Ask your platform admin to set
              the Google Place ID, then refresh from the dashboard listing.
            </p>
          ) : !data.googleRatings.distribution ? (
            // Aggregate-only fallback when DataForSEO doesn't return
            // rating_distribution. Show the rating + total reviews so the
            // panel isn't blank.
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
              <p>
                <span className="font-semibold">
                  ⭐ {(data.googleRatings.rating ?? 0).toFixed(1)}
                </span>{" "}
                from{" "}
                <span className="font-semibold">
                  {(data.googleRatings.totalReviews ?? 0).toLocaleString()}
                </span>{" "}
                review
                {data.googleRatings.totalReviews === 1 ? "" : "s"}.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Per-star breakdown isn&apos;t available for this listing.
              </p>
            </div>
          ) : (
            <RatingsHistogram
              empty={data.googleRatings.count === 0}
              emptyLabel="No reviews on Google yet."
              count={data.googleRatings.count}
              average={data.googleRatings.rating ?? 0}
              buckets={data.googleRatings.distribution}
            />
          )}
        </section>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white px-6 py-5">
        <h3 className="text-base font-semibold text-slate-900">Daily volume</h3>
        <p className="text-xs text-slate-500">
          Leads captured and appointments dated for each day in the range.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <Legend swatch="bg-indigo-500" label="Leads" />
          <Legend swatch="bg-emerald-500" label="Appointments" />
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
      {sublabel && <p className="text-xs text-slate-500">{sublabel}</p>}
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

function RatingsHistogram({
  empty,
  emptyLabel,
  count,
  average,
  buckets,
}: {
  empty: boolean;
  emptyLabel: string;
  count: number;
  average: number;
  buckets: { 1: number; 2: number; 3: number; 4: number; 5: number };
}) {
  if (empty) {
    return <p className="mt-4 text-sm text-slate-500">{emptyLabel}</p>;
  }
  return (
    <>
      {average > 0 && (
        <p className="mt-3 text-xs text-slate-600">
          Average{" "}
          <span className="font-semibold text-slate-900">
            {average.toFixed(1)}
          </span>{" "}
          from {count.toLocaleString()} rating{count === 1 ? "" : "s"}.
        </p>
      )}
      <div className="mt-3 space-y-2">
        {([5, 4, 3, 2, 1] as const).map(score => {
          const c = buckets[score];
          const ratio = count > 0 ? c / count : 0;
          return (
            <div key={score}>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold text-slate-700">
                  {"⭐".repeat(score)}
                </span>
                <span>
                  {c} · {pct(c, count)}
                </span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-amber-400"
                  style={{
                    width: `${Math.max(ratio * 100, c > 0 ? 4 : 0)}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
