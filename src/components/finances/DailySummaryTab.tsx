"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import {
  Banknote,
  Calculator,
  CreditCard,
  Receipt,
  Smartphone,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { formatRupees } from "@/lib/currency";
import MethodBarChart from "@/components/charts/MethodBarChart";
import DailyTrendChart from "@/components/charts/DailyTrendChart";
import CategoryBarChart from "@/components/charts/CategoryBarChart";

type Bucket = { method: string; total: number; count: number };

type SummaryResponse = {
  date: string;
  collectedTotal: number;
  byMethod: Record<string, Bucket>;
  pending: { total: number; count: number };
  expenses: {
    total: number;
    count: number;
    byCategory: Array<{ category: string; total: number; count: number }>;
  };
  net: number;
  weeklyTrend?: Array<{
    date: string;
    collected: number;
    expenses: number;
  }>;
};

// Local date helpers — the date input gives us YYYY-MM-DD already in
// the user's TZ, but we keep the API contract using ISO so the server
// can interpret it consistently.
const todayISO = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export default function DailySummaryTab() {
  const [date, setDate] = useState<string>(todayISO);

  const { data, isLoading } = useSWR<SummaryResponse>(
    `/api/payments/summary?date=${date}`,
  );

  const cash = data?.byMethod?.cash?.total ?? 0;
  const upi = data?.byMethod?.upi?.total ?? 0;
  const card = data?.byMethod?.card?.total ?? 0;
  const mixed = data?.byMethod?.mixed?.total ?? 0;
  const collected = data?.collectedTotal ?? 0;
  const pending = data?.pending?.total ?? 0;
  const expenses = data?.expenses?.total ?? 0;
  const net = data?.net ?? 0;

  // Stable bucket order for the by-method chart — keeps the bars in the
  // same position regardless of which methods were used today.
  const methodChartData = useMemo(() => {
    const order: Array<"cash" | "upi" | "card" | "mixed" | "pending"> = [
      "cash",
      "upi",
      "card",
      "mixed",
      "pending",
    ];
    return order.map(m => ({
      method: m,
      total: data?.byMethod?.[m]?.total ?? 0,
      count: data?.byMethod?.[m]?.count ?? 0,
    }));
  }, [data]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-sm">
        <div>
          <p className="text-sm font-semibold tracking-tight text-slate-900">
            Daily summary
          </p>
          <p className="text-xs text-slate-500">
            Totals are computed over the selected day&apos;s payments and
            expenses.
          </p>
        </div>
        <label className="inline-flex items-center gap-2 text-xs text-slate-500">
          <span>Date</span>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value || todayISO())}
            className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </label>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            <Tile
              icon={TrendingUp}
              tone="emerald"
              label="Collected"
              value={formatRupees(collected)}
              hint={`${
                Object.values(data?.byMethod ?? {}).reduce(
                  (s, b) => s + (b.method !== "pending" ? b.count : 0),
                  0,
                )
              } payments`}
            />
            <Tile
              icon={Banknote}
              tone="emerald"
              label="Cash"
              value={formatRupees(cash)}
              hint={`${data?.byMethod?.cash?.count ?? 0} entries`}
            />
            <Tile
              icon={Smartphone}
              tone="indigo"
              label="UPI"
              value={formatRupees(upi)}
              hint={`${data?.byMethod?.upi?.count ?? 0} entries`}
            />
            <Tile
              icon={CreditCard}
              tone="sky"
              label="Card"
              value={formatRupees(card)}
              hint={`${data?.byMethod?.card?.count ?? 0} entries`}
            />
            <Tile
              icon={Wallet}
              tone="violet"
              label="Mixed / Bank"
              value={formatRupees(mixed)}
              hint={`${data?.byMethod?.mixed?.count ?? 0} entries`}
            />
            <Tile
              icon={Receipt}
              tone="amber"
              label="Pending"
              value={formatRupees(pending)}
              hint={`${data?.pending?.count ?? 0} payments`}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Tile
              icon={TrendingDown}
              tone="rose"
              label="Expenses"
              value={formatRupees(expenses)}
              hint={`${data?.expenses?.count ?? 0} entries`}
            />
            <Tile
              icon={Calculator}
              tone={net >= 0 ? "emerald" : "rose"}
              label="Net for the day"
              value={formatRupees(net)}
              hint="Collected − Expenses (excludes pending)"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <MethodBarChart data={methodChartData} />
            <CategoryBarChart
              data={data?.expenses?.byCategory ?? []}
              title="Expenses by category"
              subtitle="Today's spend, grouped by category"
            />
          </div>

          <DailyTrendChart data={data?.weeklyTrend ?? []} />
        </>
      )}
    </div>
  );
}

const TONE: Record<
  string,
  { bg: string; text: string; tile: string }
> = {
  emerald: {
    bg: "bg-emerald-50 ring-1 ring-inset ring-emerald-100",
    text: "text-emerald-600",
    tile: "border-slate-200",
  },
  indigo: {
    bg: "bg-indigo-50 ring-1 ring-inset ring-indigo-100",
    text: "text-indigo-600",
    tile: "border-slate-200",
  },
  sky: { bg: "bg-sky-50 ring-1 ring-inset ring-sky-100", text: "text-sky-600", tile: "border-slate-200" },
  amber: { bg: "bg-amber-50 ring-1 ring-inset ring-amber-100", text: "text-amber-600", tile: "border-slate-200" },
  violet: {
    bg: "bg-violet-50 ring-1 ring-inset ring-violet-100",
    text: "text-violet-600",
    tile: "border-slate-200",
  },
  rose: { bg: "bg-rose-50 ring-1 ring-inset ring-rose-100", text: "text-rose-600", tile: "border-rose-100" },
};

function Tile({
  icon: Icon,
  tone,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  tone: keyof typeof TONE;
  label: string;
  value: string;
  hint?: string;
}) {
  const t = TONE[tone];
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border ${t.tile} bg-white p-5 shadow-sm`}
    >
      <span
        className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${t.bg} ${t.text}`}
      >
        <Icon size={20} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </p>
        <p className="mt-0.5 text-xl font-semibold leading-tight tracking-tight text-slate-900">
          {value}
        </p>
        {hint && <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>}
      </div>
    </div>
  );
}
