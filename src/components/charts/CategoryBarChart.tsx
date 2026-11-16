"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ChartCard from "./ChartCard";
import { formatRupees } from "@/lib/currency";

type Datum = { category: string; total: number };

const titleCase = (s: string) =>
  s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

type TooltipPayload = { payload?: Datum };

const CategoryTooltip = ({
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
      <p className="font-medium text-slate-900">{titleCase(p.category)}</p>
      <p className="text-rose-700">{formatRupees(p.total)}</p>
    </div>
  );
};

export default function CategoryBarChart({
  data,
  title = "Expenses by category",
  subtitle,
}: {
  data: Datum[];
  title?: string;
  subtitle?: string;
}) {
  const empty = !data?.length || data.every(d => d.total === 0);
  // Pre-format labels once so Recharts' XAxis renders them in title case.
  const display = data.map(d => ({ ...d, label: titleCase(d.category) }));
  return (
    <ChartCard
      title={title}
      subtitle={subtitle ?? "Total spend per category"}
      height={220}
      empty={empty}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={display}
          layout="vertical"
          margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => `₹${Math.round(v / 100)}`}
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fill: "#475569", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={108}
          />
          <Tooltip content={<CategoryTooltip />} cursor={{ fill: "#f1f5f9" }} />
          <Bar dataKey="total" fill="#f43f5e" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
