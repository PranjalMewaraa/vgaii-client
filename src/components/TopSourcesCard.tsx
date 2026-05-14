"use client";

type SourceEntry = {
  source: string;
  count: number;
};

// Fixed palette for up to 4 slices. The 5th+ slices roll into "Other".
const PALETTE = ["#6366f1", "#10b981", "#f59e0b", "#0ea5e9", "#94a3b8"];

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

// Build cumulative arc offsets for the donut. We render each slice as a
// circle with stroke-dasharray + stroke-dashoffset so we don't need a
// charting library.
const buildArcs = (
  buckets: SourceEntry[],
  circumference: number,
): Array<{ source: string; count: number; pct: number; offset: number; color: string }> => {
  const total = buckets.reduce((sum, b) => sum + b.count, 0);
  if (total === 0) return [];
  let cumulative = 0;
  return buckets.map((b, i) => {
    const pct = b.count / total;
    const arc = {
      source: b.source,
      count: b.count,
      pct,
      // Offset positions the stroke start where the previous slice ended.
      // Browsers draw stroke clockwise from 3 o'clock; we rotate the SVG
      // -90deg to start at the top.
      offset: cumulative * circumference,
      color: PALETTE[i % PALETTE.length],
    };
    cumulative += pct;
    return arc;
  });
};

export default function TopSourcesCard({
  sources,
}: {
  sources: SourceEntry[];
}) {
  const buckets = bucket(sources);
  const total = buckets.reduce((sum, b) => sum + b.count, 0);

  const R = 28;
  const C = 2 * Math.PI * R;
  const arcs = buildArcs(buckets, C);

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <h2 className="text-base font-semibold text-slate-900">Top Sources</h2>
      <p className="text-xs text-slate-500">Where your leads are coming from</p>

      {total === 0 ? (
        <p className="mt-4 text-xs text-slate-500">
          No leads recorded yet.
        </p>
      ) : (
        <div className="mt-3 flex items-center gap-4">
          <svg
            viewBox="0 0 80 80"
            className="h-24 w-24 -rotate-90"
            aria-hidden
          >
            <circle
              cx="40"
              cy="40"
              r={R}
              fill="none"
              stroke="#f1f5f9"
              strokeWidth="12"
            />
            {arcs.map(arc => (
              <circle
                key={arc.source}
                cx="40"
                cy="40"
                r={R}
                fill="none"
                stroke={arc.color}
                strokeWidth="12"
                strokeDasharray={`${arc.pct * C} ${C}`}
                strokeDashoffset={-arc.offset}
              />
            ))}
          </svg>
          <ul className="min-w-0 flex-1 space-y-1.5 text-sm">
            {arcs.map(arc => (
              <li
                key={arc.source}
                className="flex items-center justify-between gap-3"
              >
                <span className="inline-flex min-w-0 items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: arc.color }}
                  />
                  <span className="truncate text-slate-700">
                    {TITLE_CASE(arc.source)}
                  </span>
                </span>
                <span className="shrink-0 text-xs font-medium text-slate-500">
                  {Math.round(arc.pct * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
