"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

type SourceEntry = {
  source: string;
  count: number;
};

// Fixed palette for up to 4 slices. The 5th+ slices roll into "Other".
const PALETTE = ["#16a34a", "#10b981", "#f59e0b", "#0ea5e9", "#94a3b8"];

const TITLE_CASE = (s: string) =>
  s
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());

// Take the top 4 sources from the server and roll everything else into
// a single "Other" slice. Keeps the donut legible.
const bucket = (entries: SourceEntry[]): SourceEntry[] => {
  if (entries.length <= 4) return entries.filter(e => e.count > 0);
  const top = entries.slice(0, 4);
  const otherCount = entries
    .slice(4)
    .reduce((sum, e) => sum + e.count, 0);
  return otherCount > 0 ? [...top, { source: "Other", count: otherCount }] : top;
};

type TooltipPayload = {
  payload?: { label: string; value: number; pct: number };
};

const PieTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
}) => {
  if (!active || !payload?.length) return null;
  const slice = payload[0]?.payload;
  if (!slice) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-md">
      <p className="font-medium text-slate-900">{slice.label}</p>
      <p className="text-slate-500">
        {slice.value} {slice.value === 1 ? "lead" : "leads"} ·{" "}
        {Math.round(slice.pct * 100)}%
      </p>
    </div>
  );
};

export default function TopSourcesCard({
  sources,
}: {
  sources: SourceEntry[];
}) {
  const data = useMemo(() => {
    const buckets = bucket(sources);
    const total = buckets.reduce((sum, b) => sum + b.count, 0);
    if (total === 0) return [];
    return buckets.map((b, i) => ({
      label: TITLE_CASE(b.source),
      value: b.count,
      pct: b.count / total,
      color: PALETTE[i % PALETTE.length],
    }));
  }, [sources]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold tracking-tight text-slate-900">Top Sources</h2>
      <p className="text-xs text-slate-500">Where your leads are coming from</p>

      {data.length === 0 ? (
        <p className="mt-4 text-xs text-slate-500">
          No leads recorded yet.
        </p>
      ) : (
        <div className="mt-3 flex items-center gap-4">
          <div className="h-24 w-24 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={26}
                  outerRadius={44}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {data.map(d => (
                    <Cell key={d.label} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="min-w-0 flex-1 space-y-1.5 text-sm">
            {data.map(d => (
              <li
                key={d.label}
                className="flex items-center justify-between gap-3"
              >
                <span className="inline-flex min-w-0 items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: d.color }}
                  />
                  <span className="truncate text-slate-700">{d.label}</span>
                </span>
                <span className="shrink-0 text-xs font-medium text-slate-500">
                  {Math.round(d.pct * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
