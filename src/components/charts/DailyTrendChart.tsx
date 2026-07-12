"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ChartCard from "./ChartCard";
import { formatRupees } from "@/lib/currency";

type DailyTrendPoint = {
  date: string;
  collected: number;
  expenses: number;
};

const shortDay = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
  });

type TooltipPayload = { payload?: DailyTrendPoint };

const TrendTooltip = ({
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
      <p className="font-medium text-slate-900">
        {new Date(`${p.date}T00:00:00`).toLocaleDateString(undefined, {
          weekday: "long",
          month: "short",
          day: "numeric",
        })}
      </p>
      <p className="text-emerald-700">
        Collected: {formatRupees(p.collected)}
      </p>
      <p className="text-rose-700">Expenses: {formatRupees(p.expenses)}</p>
    </div>
  );
};

// Stacked-area view of collected revenue vs. expenses across the rolling
// seven-day window. Both series share the rupee Y-axis.
export default function DailyTrendChart({
  data,
}: {
  data: DailyTrendPoint[];
}) {
  const empty =
    !data?.length ||
    data.every(d => d.collected === 0 && d.expenses === 0);
  return (
    <ChartCard
      title="This week"
      subtitle="Daily collected vs. expenses"
      height={220}
      empty={empty}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="trend-collected" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="trend-expenses" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={shortDay}
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
          <Tooltip content={<TrendTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
            iconType="circle"
          />
          <Area
            type="monotone"
            name="Collected"
            dataKey="collected"
            stroke="#10b981"
            fill="url(#trend-collected)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            name="Expenses"
            dataKey="expenses"
            stroke="#f43f5e"
            fill="url(#trend-expenses)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
