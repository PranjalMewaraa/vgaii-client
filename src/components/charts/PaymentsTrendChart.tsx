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
import ChartCard from "./ChartCard";
import { formatRupees } from "@/lib/currency";

type Datum = { date: string; collected: number; count: number };

// Compact date label — "May 14" — so the X axis tolerates longer ranges
// (a full month) without crowding.
const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

type TooltipPayload = { payload?: Datum };

const PaymentsTooltip = ({
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
    <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-md">
      <p className="font-medium text-slate-900">
        {new Date(`${p.date}T00:00:00`).toLocaleDateString(undefined, {
          weekday: "long",
          month: "short",
          day: "numeric",
        })}
      </p>
      <p className="text-emerald-700">{formatRupees(p.collected)}</p>
      <p className="text-slate-500">
        {p.count} {p.count === 1 ? "payment" : "payments"}
      </p>
    </div>
  );
};

export default function PaymentsTrendChart({
  data,
  empty,
}: {
  data: Datum[];
  empty?: boolean;
}) {
  return (
    <ChartCard
      title="Daily collection"
      subtitle="Total collected per day across the filtered range"
      height={220}
      empty={empty || !data?.length}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={shortDate}
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
          <Tooltip content={<PaymentsTooltip />} />
          <Line
            type="monotone"
            dataKey="collected"
            stroke="#6366f1"
            strokeWidth={2}
            dot={{ r: 3, fill: "#6366f1" }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
