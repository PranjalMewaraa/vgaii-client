"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { Banknote, CreditCard, Link2, Plus, Smartphone, Trash2, UserPlus, Wallet, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { rupeesToPaise, formatRupees } from "@/lib/currency";
import { canonicalPhone } from "@/lib/phone";
import type { PaymentMethod } from "@/lib/constants";

type Preset = {
  id: string;
  title: string;
  amount: number;
};

type LeadHit = {
  id: string;
  name: string;
  phone: string;
};

type Props = {
  // Optional seed from a deep link (e.g. /finances?leadId=… opened from
  // the patient detail page). Auto-links the patient on mount.
  prefillLead?: LeadHit;
  // Fires after a successful save so a parent (e.g. RecordPaymentModal)
  // can dismiss itself or refresh a list view.
  onSaved?: () => void;
};

type PresetsResponse = { charges: Preset[] };
type LeadsResponse = { leads: LeadHit[] };

type LineItem = {
  // Tracking id for keyed list manipulation; not sent to the server.
  key: string;
  presetChargeId?: string;
  title: string;
  amount: number; // paise
};

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${
    typeof window !== "undefined" ? localStorage.getItem("token") : ""
  }`,
});

const METHOD_DEFS: Array<{
  key: PaymentMethod;
  label: string;
  icon: LucideIcon;
  className: string;
  activeClass: string;
}> = [
  {
    key: "cash",
    label: "Cash",
    icon: Banknote,
    className: "border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50",
    activeClass: "border-emerald-500 bg-emerald-600 text-white shadow-sm",
  },
  {
    key: "upi",
    label: "UPI",
    icon: Smartphone,
    className: "border-green-200 bg-white text-green-700 hover:bg-green-50",
    activeClass: "border-green-500 bg-green-600 text-white shadow-sm",
  },
  {
    key: "card",
    label: "Card",
    icon: CreditCard,
    className: "border-sky-200 bg-white text-sky-700 hover:bg-sky-50",
    activeClass: "border-sky-500 bg-sky-600 text-white shadow-sm",
  },
  {
    key: "mixed",
    label: "Mixed",
    icon: Wallet,
    className: "border-violet-200 bg-white text-violet-700 hover:bg-violet-50",
    activeClass: "border-violet-500 bg-violet-600 text-white shadow-sm",
  },
  {
    key: "pending",
    label: "Pending",
    icon: Wallet,
    className: "border-amber-200 bg-white text-amber-700 hover:bg-amber-50",
    activeClass: "border-amber-500 bg-amber-500 text-white shadow-sm",
  },
];

// Generate a per-line stable key without pulling in nanoid.
const newKey = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export default function PaymentEntryTab({ prefillLead, onSaved }: Props = {}) {
  // Patient picker — phone-first lookup. Type a phone number; if it
  // matches an existing patient we offer one-click link, otherwise the
  // receptionist types a name and we record a walk-in payment with the
  // entered phone snapshotted onto the row.
  // Seed from the deep-link prop so /finances?leadId=… opens with the
  // patient already linked.
  const [linkedLead, setLinkedLead] = useState<LeadHit | null>(
    prefillLead ?? null,
  );
  const [phone, setPhone] = useState(prefillLead?.phone ?? "");
  const [name, setName] = useState(prefillLead?.name ?? "");
  const [debouncedPhone, setDebouncedPhone] = useState(prefillLead?.phone ?? "");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedPhone(phone), 250);
    return () => clearTimeout(t);
  }, [phone]);

  // Match against existing leads/patients by the canonical 10-digit
  // tail so spaces, dashes, and +91 prefixes all collapse to the same
  // key (mirrors phoneNormalized in the schema).
  const canonical = canonicalPhone(debouncedPhone);
  const { data: leadsData } = useSWR<LeadsResponse>(
    !linkedLead && canonical.length >= 6
      ? `/api/leads?all=1&search=${encodeURIComponent(canonical)}`
      : null,
  );
  // Filter to exact 10-digit tail matches when we have a full phone — the
  // server endpoint does a LIKE search so partial digits can pull in
  // unrelated rows.
  const leadHits = useMemo(() => {
    const hits = leadsData?.leads ?? [];
    if (canonical.length < 10) return hits;
    return hits.filter(h => canonicalPhone(h.phone) === canonical);
  }, [leadsData, canonical]);

  const { data: presetsData } = useSWR<PresetsResponse>("/api/preset-charges");
  const presets = useMemo(() => presetsData?.charges ?? [], [presetsData]);

  // Payment composition
  const [items, setItems] = useState<LineItem[]>([]);
  const [discountInput, setDiscountInput] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  // Custom one-off line input (for charges that don't have a preset)
  const [customTitle, setCustomTitle] = useState("");
  const [customAmount, setCustomAmount] = useState("");

  const addPreset = (p: Preset) => {
    setItems(prev => [
      ...prev,
      { key: newKey(), presetChargeId: p.id, title: p.title, amount: p.amount },
    ]);
  };

  const addCustom = () => {
    const rupees = Number(customAmount);
    if (!customTitle.trim() || !Number.isFinite(rupees) || rupees < 0) return;
    setItems(prev => [
      ...prev,
      {
        key: newKey(),
        title: customTitle.trim(),
        amount: rupeesToPaise(rupees),
      },
    ]);
    setCustomTitle("");
    setCustomAmount("");
  };

  const removeItem = (key: string) =>
    setItems(prev => prev.filter(i => i.key !== key));

  const totalPaise = items.reduce((s, i) => s + i.amount, 0);
  const discountPaise = (() => {
    const n = Number(discountInput);
    return Number.isFinite(n) && n > 0 ? rupeesToPaise(n) : 0;
  })();
  const finalPaise = Math.max(0, totalPaise - discountPaise);

  const linkLead = (lead: LeadHit) => {
    setLinkedLead(lead);
    setPhone(lead.phone);
    setName(lead.name);
  };

  const unlink = () => {
    setLinkedLead(null);
  };

  const reset = () => {
    setLinkedLead(null);
    setPhone("");
    setName("");
    setItems([]);
    setDiscountInput("");
    setMethod("cash");
    setNotes("");
  };

  const save = async () => {
    setError(null);
    setSavedMsg(null);
    if (items.length === 0) return setError("Add at least one charge");
    if (!linkedLead && name.trim().length < 1) {
      return setError("Enter a name or link an existing patient");
    }

    setBusy(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          leadId: linkedLead?.id,
          patientName: linkedLead ? undefined : name.trim() || undefined,
          patientPhone: linkedLead ? undefined : phone.trim() || undefined,
          items: items.map(i => ({
            presetChargeId: i.presetChargeId,
            title: i.title,
            amount: i.amount,
          })),
          discount: discountPaise || undefined,
          paymentMethod: method,
          notes: notes.trim() || undefined,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(
          typeof body?.error === "string" ? body.error : "Failed to save",
        );
        return;
      }
      setSavedMsg(`Saved ${formatRupees(finalPaise)} payment`);
      reset();
      onSaved?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Left + middle column: patient + charges + payment method */}
      <div className="space-y-5 lg:col-span-2">
        {/* Patient picker */}
        <section className="rounded-xl border border-slate-200/70 bg-white p-6">
          <h2 className="text-base font-semibold tracking-tight text-slate-900">Patient</h2>
          <p className="text-xs text-slate-500">
            Enter a phone number first — we&apos;ll auto-link if it matches
            an existing patient.
          </p>

          <div className="mt-3 space-y-3">
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Phone *
              </span>
              <input
                value={phone}
                onChange={e => {
                  setPhone(e.target.value);
                  if (linkedLead) setLinkedLead(null);
                }}
                inputMode="tel"
                autoFocus
                placeholder="10-digit number"
                className="mt-1 w-full rounded-lg border border-slate-200/70 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
              />
            </label>

            {linkedLead ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                <div className="inline-flex items-center gap-2">
                  <Link2 size={14} className="text-emerald-600" />
                  <div>
                    <p className="font-medium text-slate-900">
                      {linkedLead.name}
                    </p>
                    <p className="text-xs text-slate-600">{linkedLead.phone}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={unlink}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  Unlink
                </button>
              </div>
            ) : leadHits.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-slate-500">
                  Existing {leadHits.length === 1 ? "patient" : "patients"}{" "}
                  with this number:
                </p>
                <ul className="divide-y divide-slate-100 rounded-lg border border-green-200 bg-green-50/40">
                  {leadHits.slice(0, 4).map(h => (
                    <li
                      key={h.id}
                      className="flex items-center justify-between gap-3 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {h.name}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {h.phone}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => linkLead(h)}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#1f3d2b] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#16301f]"
                      >
                        <Link2 size={12} />
                        Link
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {!linkedLead && (
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Name *
                </span>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={
                    canonical.length >= 10 && leadHits.length === 0
                      ? "No match — enter walk-in name"
                      : "Patient name"
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200/70 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
                />
              </label>
            )}
          </div>
        </section>

        {/* Preset charges */}
        <section className="rounded-xl border border-slate-200/70 bg-white p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold tracking-tight text-slate-900">Charges</h2>
            <span className="text-xs text-slate-500">
              Tap to add. Multiple charges combine into one payment.
            </span>
          </div>

          {presets.length === 0 ? (
            <p className="mt-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-500">
              No preset charges configured yet. Add them on the{" "}
              <strong>Preset Charges</strong> tab.
            </p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {presets.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addPreset(p)}
                  className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-white px-3 py-1.5 text-sm font-medium text-green-700 transition hover:bg-green-50"
                >
                  <Plus size={12} />
                  <span>{p.title}</span>
                  <span className="text-xs text-slate-500">
                    {formatRupees(p.amount)}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Custom one-off line */}
          <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3">
            <label className="block flex-1 min-w-[140px]">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Custom line
              </span>
              <input
                value={customTitle}
                onChange={e => setCustomTitle(e.target.value)}
                placeholder="e.g. Suture removal"
                className="mt-1 w-full rounded-lg border border-slate-200/70 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                ₹
              </span>
              <input
                value={customAmount}
                onChange={e => setCustomAmount(e.target.value)}
                inputMode="numeric"
                placeholder="0"
                className="mt-1 w-28 rounded-lg border border-slate-200/70 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
              />
            </label>
            <button
              type="button"
              onClick={addCustom}
              disabled={!customTitle.trim() || !Number(customAmount)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
            >
              <UserPlus size={12} />
              Add line
            </button>
          </div>

          {/* Selected lines */}
          {items.length > 0 && (
            <ul className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200/70">
              {items.map(i => (
                <li
                  key={i.key}
                  className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                >
                  <span className="truncate font-medium text-slate-900">
                    {i.title}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-700">{formatRupees(i.amount)}</span>
                    <button
                      type="button"
                      onClick={() => removeItem(i.key)}
                      aria-label={`Remove ${i.title}`}
                      className="rounded p-1 text-red-500 hover:bg-red-50"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Payment method */}
        <section className="rounded-xl border border-slate-200/70 bg-white p-6">
          <h2 className="text-base font-semibold tracking-tight text-slate-900">
            Payment method
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {METHOD_DEFS.map(m => {
              const Icon = m.icon;
              const active = method === m.key;
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setMethod(m.key)}
                  className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-3 text-sm font-semibold transition ${
                    active ? m.activeClass : m.className
                  }`}
                >
                  <Icon size={16} />
                  {m.label}
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* Right column: totals + notes + save */}
      <aside className="space-y-5 lg:col-span-1">
        <section className="rounded-xl border border-slate-200/70 bg-white p-6">
          <h2 className="text-base font-semibold tracking-tight text-slate-900">Total</h2>

          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-medium text-slate-900">
                {formatRupees(totalPaise)}
              </span>
            </div>
            <label className="block">
              <span className="text-xs text-slate-500">Discount (₹)</span>
              <input
                value={discountInput}
                onChange={e => setDiscountInput(e.target.value)}
                inputMode="numeric"
                placeholder="0"
                className="mt-1 w-full rounded-lg border border-slate-200/70 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
              />
            </label>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 text-base font-semibold tracking-tight">
            <span className="text-slate-700">Final</span>
            <span className="text-green-700">{formatRupees(finalPaise)}</span>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200/70 bg-white p-6">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Notes
            </span>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Anything to remember about this payment…"
              className="mt-1 w-full rounded-lg border border-slate-200/70 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
            />
          </label>
        </section>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        )}
        {savedMsg && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            {savedMsg}
          </p>
        )}

        <button
          type="button"
          onClick={save}
          disabled={busy || items.length === 0}
          className="w-full rounded-lg bg-[#1f3d2b] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#16301f] disabled:opacity-60"
        >
          {busy ? "Saving…" : `Save payment · ${formatRupees(finalPaise)}`}
        </button>
        <button
          type="button"
          onClick={reset}
          className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          <Trash2 size={12} className="-mt-0.5 mr-1 inline" />
          Clear form
        </button>
      </aside>
    </div>
  );
}
