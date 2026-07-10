"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Small line chart used for the Medical History vitals row. Designed to
// render multiple in a side-by-side grid, so axes are stripped and the
// container is short. Two-line mode (BP) renders systolic + diastolic.

export type VitalsPoint = {
  date: string;
  // Either a single series ("value") or BP-style two-line ("systolic" +
  // "diastolic"). The component picks based on which keys are non-null.
  value?: number | null;
  systolic?: number | null;
  diastolic?: number | null;
};

type Props = {
  title: string;
  unit: string;
  // Recharts colour for the main series. BP charts use this for systolic
  // and a softer slate for diastolic so the lines are distinguishable.
  color: string;
  data: VitalsPoint[];
  mode?: "single" | "bp";
};

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

type TooltipPayload = { payload?: VitalsPoint };

const VitalTooltip = ({
  active,
  payload,
  unit,
  mode,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  unit: string;
  mode: "single" | "bp";
}) => {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-md">
      <p className="font-medium text-slate-900">
        {new Date(p.date).toLocaleDateString(undefined, {
          weekday: "long",
          month: "short",
          day: "numeric",
        })}
      </p>
      {mode === "bp" ? (
        <p className="text-slate-600">
          {p.systolic ?? "—"} / {p.diastolic ?? "—"} {unit}
        </p>
      ) : (
        <p className="text-slate-600">
          {p.value ?? "—"} {unit}
        </p>
      )}
    </div>
  );
};

export default function VitalsTrendChart({
  title,
  unit,
  color,
  data,
  mode = "single",
}: Props) {
  // Filter to points that have a relevant value — a visit with diagnosis
  // but no weight reading shouldn't anchor the weight chart.
  const series =
    mode === "bp"
      ? data.filter(p => p.systolic != null || p.diastolic != null)
      : data.filter(p => p.value != null);

  // Too few points to draw a trend; render a polite stub instead so the
  // grid keeps its visual rhythm.
  if (series.length < 2) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </p>
        <p className="mt-2 text-xs text-slate-400">
          Need at least two readings to chart a trend.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </p>
        <p className="text-[11px] text-slate-400">{unit}</p>
      </div>
      <div className="mt-2 h-24">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={series}
            margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
              tick={{ fill: "#94a3b8", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: "#94a3b8", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={28}
              domain={["dataMin - 2", "dataMax + 2"]}
            />
            <Tooltip content={<VitalTooltip unit={unit} mode={mode} />} />
            {mode === "bp" ? (
              <>
                <Line
                  type="monotone"
                  dataKey="systolic"
                  stroke={color}
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: color }}
                  activeDot={{ r: 4 }}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="diastolic"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: "#94a3b8" }}
                  activeDot={{ r: 4 }}
                  isAnimationActive={false}
                />
              </>
            ) : (
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                dot={{ r: 2.5, fill: color }}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
