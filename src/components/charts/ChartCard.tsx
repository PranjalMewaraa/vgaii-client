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
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
      {empty ? (
        <p className="mt-4 text-xs text-slate-500">No data for this range.</p>
      ) : (
        <div className="mt-3" style={{ height }}>
          {children}
        </div>
      )}
    </div>
  );
}
