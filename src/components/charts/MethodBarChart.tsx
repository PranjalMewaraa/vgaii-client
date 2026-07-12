"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ChartCard from "./ChartCard";
import { formatRupees } from "@/lib/currency";

// Tones echo the colour palette used on the Daily Summary tiles so the
// chart bars and the corresponding tile read as one widget.
const METHOD_COLORS: Record<string, string> = {
  cash: "#10b981",
  upi: "#16a34a",
  card: "#0ea5e9",
  mixed: "#8b5cf6",
  pending: "#f59e0b",
};

type Datum = { method: string; total: number; count: number };

type TooltipPayload = { payload?: Datum };

const MethodTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
}) => {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  return (
    <div className="rounded-lg border border-slate-200/70 bg-white px-2.5 py-1.5 text-xs shadow-md">
      <p className="font-medium text-slate-900 capitalize">{p.method}</p>
      <p className="text-slate-500">
        {formatRupees(p.total)} · {p.count} {p.count === 1 ? "entry" : "entries"}
      </p>
    </div>
  );
};

export default function MethodBarChart({
  data,
}: {
  data: Datum[];
}) {
  const empty = !data?.length || data.every(d => d.total === 0);
  return (
    <ChartCard
      title="Collected by method"
      subtitle="Cash, UPI, card, and pending totals for the selected day"
      height={200}
      empty={empty}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="method"
            tickFormatter={v => String(v).replace(/^./, c => c.toUpperCase())}
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => `₹${Math.round(v / 100)}`}
            width={48}
          />
          <Tooltip
            content={<MethodTooltip />}
            cursor={{ fill: "#f1f5f9" }}
          />
          <Bar dataKey="total" radius={[4, 4, 0, 0]}>
            {data.map(d => (
              <Cell
                key={d.method}
                fill={METHOD_COLORS[d.method] ?? "#94a3b8"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
