"use client";

import type { ReactNode } from "react";

// Thin presentational shell so every chart on the dashboard / finances
// pages has the same card chrome, title, subtitle, and chart-height
// container. The chart itself is rendered via a render-prop so we can
// drop different Recharts trees inside without duplicating layout.

export default function ChartCard({
  title,
  subtitle,
  height = 180,
  empty,
  children,
}: {
  title: string;
  subtitle?: string;
  height?: number;
  empty?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200/70 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-slate-900">
          {title}
        </h2>
        {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
      </div>
      {empty ? (
        <div
          className="mt-3 flex items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50"
          style={{ height }}
        >
          <p className="text-xs text-slate-400">No data for this range.</p>
        </div>
      ) : (
        <div className="mt-4" style={{ height }}>
          {children}
        </div>
      )}
    </div>
  );
}
