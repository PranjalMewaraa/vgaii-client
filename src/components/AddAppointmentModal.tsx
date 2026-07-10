"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import SlotPicker from "@/components/SlotPicker";
import type { BookingConfig } from "@/lib/validators/bookingConfig";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  // Optional ISO/datetime-local seed for the Manual tab (calendar slot click).
  prefillDate?: string;
};

type LeadHit = {
  id: string;
  name: string;
  phone: string;
};

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${
    typeof window !== "undefined" ? localStorage.getItem("token") : ""
  }`,
});

const authHeader = () => ({
  Authorization: `Bearer ${
    typeof window !== "undefined" ? localStorage.getItem("token") : ""
  }`,
});

type Mode = "self" | "manual";

export default function AddAppointmentModal({
  open,
  onClose,
  onCreated,
  prefillDate,
}: Props) {
  if (!open) return null;
  return (
    <Shell onClose={onClose} onCreated={onCreated} prefillDate={prefillDate} />
  );
}

function Shell({
  onClose,
  onCreated,
  prefillDate,
}: {
  onClose: () => void;
  onCreated: () => void;
  prefillDate?: string;
}) {
  const { data: cfgData } = useSWR<{ config: BookingConfig }>(
    "/api/booking/config",
  );
  const config = cfgData?.config;
  const selfEnabled = !!config?.enabled;
  const configLoading = cfgData === undefined;

  // `picked` = explicit user tab choice; falls back to the primary tab for
  // the current config. Derived in render (no setState-in-effect).
  const [picked, setPicked] = useState<Mode | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const primary: Mode = selfEnabled ? "self" : "manual";
  let effectiveMode: Mode = picked ?? primary;
  if (effectiveMode === "self" && !selfEnabled) effectiveMode = "manual";

  const subtitle =
    effectiveMode === "self"
      ? "Pick an available slot from your clinic hours."
      : "Record an appointment manually — useful for walk-ins and back-dated visits.";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-8 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">
              Add appointment
            </h2>
            <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {selfEnabled && (
          <div
            data-tour="appt-modal-mode-tabs"
            className="flex border-b border-slate-200"
          >
            <ModeTab
              label="Book a slot"
              active={effectiveMode === "self"}
              onClick={() => setPicked("self")}
            />
            <ModeTab
              label="Manual entry"
              active={effectiveMode === "manual"}
              onClick={() => setPicked("manual")}
            />
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-auto">
          {configLoading ? (
            <p className="px-5 py-6 text-sm text-slate-500">Loading…</p>
          ) : effectiveMode === "self" ? (
            <ManualForm
              onClose={onClose}
              onCreated={onCreated}
              slotMode
              slotMinutes={config!.slotMinutes}
              advanceDays={config!.advanceDays}
            />
          ) : (
            <ManualForm
              onClose={onClose}
              onCreated={onCreated}
              prefillDate={prefillDate}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ModeTab({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 border-b-2 px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
        active
          ? "border-blue-600 text-blue-700"
          : "border-transparent text-slate-500 hover:text-slate-700"
      }`}
    >
      {label}
    </button>
  );
}

function ManualForm({
  onClose,
  onCreated,
  slotMode = false,
  slotMinutes,
  advanceDays,
  prefillDate,
}: {
  onClose: () => void;
  onCreated: () => void;
  slotMode?: boolean;
  slotMinutes?: number;
  advanceDays?: number;
  prefillDate?: string;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [date, setDate] = useState(() =>
    slotMode ? "" : (prefillDate ?? defaultDateValue()),
  );
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [notes, setNotes] = useState("");

  // Lead linking — search by name/phone, debounce, pick one optionally.
  const [leadQuery, setLeadQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [leadHits, setLeadHits] = useState<LeadHit[]>([]);
  const [linkedLead, setLinkedLead] = useState<LeadHit | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchAbortRef = useRef<AbortController | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(leadQuery), 250);
    return () => clearTimeout(t);
  }, [leadQuery]);

  useEffect(() => {
    if (linkedLead) return;
    const q = debouncedQuery.trim();
    if (q.length < 2) return;
    searchAbortRef.current?.abort();
    const ctrl = new AbortController();
    searchAbortRef.current = ctrl;
    (async () => {
      try {
        // ?all=1 lets us link appointments to leads at any stage,
        // including ones that have already converted to patients.
        const res = await fetch(
          `/api/leads?all=1&search=${encodeURIComponent(q)}`,
          { headers: authHeader(), signal: ctrl.signal },
        );
        if (!res.ok) return;
        const body = (await res.json()) as { leads?: LeadHit[] };
        setLeadHits((body.leads ?? []).slice(0, 8));
      } catch {
        // aborted or network — ignore
      }
    })();
    return () => ctrl.abort();
  }, [debouncedQuery, linkedLead]);

  // The hit list is hidden whenever a lead is already linked or the
  // user hasn't typed enough to trigger a search — deriving here means
  // we don't need an effect to reset `leadHits` to an empty array.
  const displayedHits = useMemo(
    () => (linkedLead || debouncedQuery.trim().length < 2 ? [] : leadHits),
    [linkedLead, debouncedQuery, leadHits],
  );

  const pickLead = (lead: LeadHit) => {
    setLinkedLead(lead);
    setLeadQuery("");
    setSearchOpen(false);
    // Pre-fill name/phone if blank, so the appointment carries the
    // patient's contact info even if linking is later removed.
    if (!name.trim()) setName(lead.name);
    if (!phone.trim()) setPhone(lead.phone);
  };

  const clearLead = () => {
    setLinkedLead(null);
    setLeadQuery("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError("Name is required");
    if (phone.trim().length < 10)
      return setError("Phone must be at least 10 characters");
    if (!date)
      return setError(slotMode ? "Pick a slot" : "Date and time are required");
    if (age && !/^\d+$/.test(age))
      return setError("Age must be a whole number");

    setBusy(true);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          date: new Date(date).toISOString(),
          age: age ? Number(age) : undefined,
          gender: gender.trim() || undefined,
          notes: notes.trim() || undefined,
          leadId: linkedLead?.id,
          durationMin: slotMode ? slotMinutes : undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(
          typeof body?.error === "string"
            ? body.error
            : `Failed to create appointment (${res.status})`,
        );
        return;
      }
      onCreated();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create appointment",
      );
    } finally {
      setBusy(false);
    }
  };

  const showHits = useMemo(
    () => searchOpen && !linkedLead && displayedHits.length > 0,
    [searchOpen, linkedLead, displayedHits],
  );

  return (
    <form
      onSubmit={submit}
      data-tour="appt-modal-form"
      className="px-5 py-4"
    >
      <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Name *
              </span>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Phone *
              </span>
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                inputMode="tel"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
          </div>

          {slotMode ? (
            <div className="block">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Pick a slot *
              </span>
              <div className="mt-1">
                <SlotPicker
                  value={date}
                  onChange={setDate}
                  advanceDays={advanceDays}
                />
              </div>
            </div>
          ) : (
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Date &amp; time *
              </span>
              <input
                type="datetime-local"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
          )}

          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Email
            </span>
            <input
              value={email}
              onChange={e => setEmail(e.target.value)}
              type="email"
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Age
              </span>
              <input
                value={age}
                onChange={e => setAge(e.target.value)}
                inputMode="numeric"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Gender
              </span>
              <select
                value={gender}
                onChange={e => setGender(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">—</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </label>
          </div>

          <div className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Link to existing lead
            </span>
            {linkedLead ? (
              <div className="mt-1 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
                <span>
                  <span className="font-medium text-slate-900">
                    {linkedLead.name}
                  </span>
                  <span className="ml-2 text-slate-600">{linkedLead.phone}</span>
                </span>
                <button
                  type="button"
                  onClick={clearLead}
                  className="text-xs text-slate-500 transition-colors hover:text-slate-700"
                >
                  Unlink
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  value={leadQuery}
                  onChange={e => {
                    setLeadQuery(e.target.value);
                    setSearchOpen(true);
                  }}
                  onFocus={() => setSearchOpen(true)}
                  placeholder="Search by name or phone…"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                {showHits && (
                  <ul className="absolute left-0 right-0 z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                    {displayedHits.map(hit => (
                      <li key={hit.id}>
                        <button
                          type="button"
                          onClick={() => pickLead(hit)}
                          className="block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50"
                        >
                          <span className="font-medium text-slate-900">
                            {hit.name}
                          </span>
                          <span className="ml-2 text-xs text-slate-500">
                            {hit.phone}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Notes
            </span>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
        </div>

        {error && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        )}

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 disabled:opacity-60"
        >
          {busy ? "Adding…" : "Add appointment"}
        </button>
      </div>
    </form>
  );
}

// Pre-fill the datetime-local input with "now" rounded up to the next
// 15-minute slot — typical clinic spacing, saves the user a few clicks.
function defaultDateValue(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 15 - (d.getMinutes() % 15), 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
