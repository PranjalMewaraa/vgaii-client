"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { Plus, Search } from "lucide-react";
import { formatRupees } from "@/lib/currency";
import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/constants";
import RecordPaymentModal from "@/components/finances/RecordPaymentModal";

type Payment = {
  id: string;
  amount: number;
  discount: number;
  finalAmount: number;
  paymentMethod: PaymentMethod;
  notes: string;
  patientName?: string | null;
  patientPhone?: string | null;
  createdAt: string;
  lead?: { id: string; name: string; phone: string } | null;
  collectedBy?: { id: string; name?: string | null; email?: string | null } | null;
  items: Array<{ title: string; amount: number }>;
};

type LeadHit = { id: string; name: string; phone: string };

type Preset = "today" | "week" | "month" | "all";

const PRESET_LABELS: Record<Preset, string> = {
  today: "Today",
  week: "This week",
  month: "This month",
  all: "All time",
};

// Date bounds snapped to start/end of day so SWR keys are stable through
// the calendar day (same trick the Reports tab uses).
const rangeFor = (
  preset: Preset,
): { from?: string; to?: string } => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  if (preset === "today") {
    return { from: start.toISOString(), to: end.toISOString() };
  }
  if (preset === "week") {
    start.setDate(start.getDate() - 6);
    return { from: start.toISOString(), to: end.toISOString() };
  }
  if (preset === "month") {
    start.setDate(1);
    return { from: start.toISOString(), to: end.toISOString() };
  }
  return {};
};

type Props = {
  prefillLead?: LeadHit;
  // True when the page was deep-linked with ?new=1 — typically from
  // the floating quick-action button. Opens the modal on first paint
  // without prefilling a lead.
  autoOpenNew?: boolean;
};

export default function PaymentsListTab({
  prefillLead,
  autoOpenNew,
}: Props = {}) {
  // Open the entry modal automatically when the page is deep-linked with
  // a leadId so receptionists land straight in the form, or with ?new=1
  // from the floating quick-action FAB.
  const [open, setOpen] = useState(!!prefillLead || !!autoOpenNew);

  const [preset, setPreset] = useState<Preset>("today");
  const [method, setMethod] = useState<"" | PaymentMethod>("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const swrKey = useMemo(() => {
    const { from, to } = rangeFor(preset);
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (method) params.set("method", method);
    return `/api/payments?${params.toString()}`;
  }, [preset, method]);

  const { data, isLoading, mutate } = useSWR<{ payments: Payment[] }>(swrKey, {
    revalidateOnFocus: false,
  });
  const payments = useMemo(() => data?.payments ?? [], [data]);

  // Search filters in-memory across patient name/phone and item titles —
  // the API doesn't support a search param yet for payments.
  const visible = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return payments;
    return payments.filter(p => {
      const name = (p.lead?.name ?? p.patientName ?? "").toLowerCase();
      const phone = (p.lead?.phone ?? p.patientPhone ?? "").toLowerCase();
      const items = p.items.map(i => i.title.toLowerCase()).join(" ");
      return name.includes(q) || phone.includes(q) || items.includes(q);
    });
  }, [payments, debouncedSearch]);

  const totals = useMemo(() => {
    let collected = 0;
    let pending = 0;
    for (const p of visible) {
      if (p.paymentMethod === "pending") pending += p.finalAmount;
      else collected += p.finalAmount;
    }
    return { collected, pending };
  }, [visible]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-white px-6 py-4">
        <div className="flex flex-wrap items-center gap-2">
          {(["today", "week", "month", "all"] as Preset[]).map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setPreset(p)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                preset === p
                  ? "bg-green-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {PRESET_LABELS[p]}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#1f3d2b] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#16301f]"
        >
          <Plus size={12} />
          New payment
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200/70 bg-white p-6">
        <label className="block flex-1 min-w-[200px]">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Search
          </span>
          <div className="relative mt-1">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Patient, phone, or charge…"
              className="w-full rounded-lg border border-slate-200/70 bg-white px-3.5 py-2 pl-9 text-sm text-slate-900 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
            />
          </div>
        </label>
        <label className="block">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Method
          </span>
          <select
            value={method}
            onChange={e => setMethod(e.target.value as typeof method)}
            className="mt-1 rounded-lg border border-slate-200/70 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
          >
            <option value="">All</option>
            {PAYMENT_METHODS.map(m => (
              <option key={m} value={m}>
                {m.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <SummaryTile
          label="Collected"
          value={formatRupees(totals.collected)}
          hint={`${visible.filter(p => p.paymentMethod !== "pending").length} payments`}
          tone="emerald"
        />
        <SummaryTile
          label="Pending"
          value={formatRupees(totals.pending)}
          hint={`${visible.filter(p => p.paymentMethod === "pending").length} entries`}
          tone="amber"
        />
        <SummaryTile
          label="Total entries"
          value={String(visible.length)}
          tone="slate"
        />
      </div>

      <div className="rounded-xl border border-slate-200/70 bg-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200/70 px-6 py-4">
          <h2 className="text-base font-semibold tracking-tight text-slate-900">
            Payments ({visible.length})
          </h2>
          <span className="text-xs text-slate-500">{PRESET_LABELS[preset]}</span>
        </div>
        {isLoading ? (
          <p className="px-6 py-4 text-sm text-slate-500">Loading…</p>
        ) : visible.length === 0 ? (
          <p className="px-6 py-4 text-sm text-slate-500">
            No payments match these filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/60">
                <tr className="border-b border-slate-200/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-3 text-left">Date</th>
                  <th className="px-6 py-3 text-left">Patient</th>
                  <th className="px-6 py-3 text-left">Items</th>
                  <th className="px-6 py-3 text-left">Method</th>
                  <th className="px-6 py-3 text-left">Collected by</th>
                  <th className="px-6 py-3 text-right">Final</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map(p => (
                  <tr key={p.id} className="transition-colors hover:bg-slate-50/70">
                    <td className="px-6 py-3.5 text-xs text-slate-500">
                      {new Date(p.createdAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-6 py-3.5 text-slate-900">
                      {p.lead?.name ?? p.patientName ?? "—"}
                      {(p.lead?.phone || p.patientPhone) && (
                        <span className="ml-2 text-xs text-slate-500">
                          {p.lead?.phone ?? p.patientPhone}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-slate-700">
                      <span>{p.items.map(i => i.title).join(" + ")}</span>
                      {p.discount > 0 && (
                        <span className="ml-1 text-[11px] text-slate-500">
                          (−{formatRupees(p.discount)})
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="inline-flex items-center rounded-full bg-slate-50 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-slate-600 ring-1 ring-inset ring-slate-200">
                        {p.paymentMethod}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-xs text-slate-500">
                      {p.collectedBy?.name ?? p.collectedBy?.email ?? "—"}
                    </td>
                    <td className="px-6 py-3.5 text-right font-medium text-slate-900">
                      {formatRupees(p.finalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <RecordPaymentModal
        open={open}
        onClose={() => setOpen(false)}
        onSaved={() => mutate()}
        prefillLead={prefillLead}
      />
    </div>
  );
}

function SummaryTile({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone: "emerald" | "amber" | "slate";
}) {
  const toneClass: Record<typeof tone, string> = {
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    slate: "text-slate-900",
  };
  return (
    <div className="rounded-xl border border-slate-200/70 bg-white p-6">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className={`mt-0.5 text-2xl font-semibold leading-tight tracking-tight ${toneClass[tone]}`}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}
