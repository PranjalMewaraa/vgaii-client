"use client";

import { useEffect, useState } from "react";
import AttachmentsSection from "@/components/AttachmentsSection";
import StatusPill from "@/components/StatusPill";

export type EditAppointment = {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  date?: string | null;
  source?: string | null;
  status?: string | null;
  notes?: string | null;
  diagnosis?: string | null;
  medicines?: string[] | null;
  weightKg?: number | null;
  sugarMgDl?: number | null;
  bpSystolic?: number | null;
  bpDiastolic?: number | null;
};

type Props = {
  appointment: EditAppointment | null;
  // "edit" lets the receptionist change every field; "visit" pre-selects
  // the completed status (Mark-visited button) but is otherwise identical.
  mode: "edit" | "visit";
  onClose: () => void;
  onSaved: () => void;
};

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${
    typeof window !== "undefined" ? localStorage.getItem("token") : ""
  }`,
});

const vitalOrNull = (raw: string): number | null | undefined => {
  if (raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
};

export default function EditAppointmentModal({
  appointment,
  mode,
  onClose,
  onSaved,
}: Props) {
  if (!appointment) return null;
  return (
    <Form
      key={appointment.id + ":" + mode}
      appointment={appointment}
      mode={mode}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}

function Form({
  appointment: a,
  mode,
  onClose,
  onSaved,
}: {
  appointment: EditAppointment;
  mode: "edit" | "visit";
  onClose: () => void;
  onSaved: () => void;
}) {
  const [date, setDate] = useState(
    a.date ? new Date(a.date).toISOString().slice(0, 16) : "",
  );
  const [status, setStatus] = useState<string>(
    mode === "visit" ? "completed" : a.status ?? "scheduled",
  );
  const [diagnosis, setDiagnosis] = useState(a.diagnosis ?? "");
  const [medicines, setMedicines] = useState((a.medicines ?? []).join("\n"));
  const [notes, setNotes] = useState(a.notes ?? "");
  const [weight, setWeight] = useState(
    a.weightKg != null ? String(a.weightKg) : "",
  );
  const [sugar, setSugar] = useState(
    a.sugarMgDl != null ? String(a.sugarMgDl) : "",
  );
  const [bpSys, setBpSys] = useState(
    a.bpSystolic != null ? String(a.bpSystolic) : "",
  );
  const [bpDia, setBpDia] = useState(
    a.bpDiastolic != null ? String(a.bpDiastolic) : "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/appointments/${a.id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({
          date: date ? new Date(date).toISOString() : undefined,
          status,
          diagnosis,
          notes,
          medicines: medicines
            ? medicines.split("\n").map(s => s.trim()).filter(Boolean)
            : [],
          weightKg: vitalOrNull(weight),
          sugarMgDl: vitalOrNull(sugar),
          bpSystolic: vitalOrNull(bpSys),
          bpDiastolic: vitalOrNull(bpDia),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(
          typeof body?.error === "string" ? body.error : "Failed to save",
        );
        return;
      }
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-6 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">
              {mode === "visit" ? "Mark visited" : "Edit appointment"}
            </h2>
            <p className="mt-0.5 inline-flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>{a.name || "Unnamed"}</span>
              {a.phone && <span>· {a.phone}</span>}
              <StatusPill status={a.status ?? "scheduled"} />
            </p>
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

        <div className="flex-1 overflow-auto px-5 py-4">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Date &amp; time
                </span>
                <input
                  type="datetime-local"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Status
                </span>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Visited</option>
                  <option value="no_show">No show</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
            </div>

            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Diagnosis
              </span>
              <textarea
                value={diagnosis}
                onChange={e => setDiagnosis(e.target.value)}
                rows={2}
                placeholder="What was diagnosed during this visit"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Medicines (one per line)
              </span>
              <textarea
                value={medicines}
                onChange={e => setMedicines(e.target.value)}
                rows={3}
                placeholder={
                  "Amoxicillin 500mg — 3 times a day for 5 days\nIbuprofen 400mg — as needed"
                }
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Notes
              </span>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
              />
            </label>

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Vitals (optional)
              </p>
              <div className="mt-1 grid grid-cols-2 gap-4 md:grid-cols-4">
                <VitalInput label="Weight (kg)" value={weight} onChange={setWeight} />
                <VitalInput label="Sugar (mg/dL)" value={sugar} onChange={setSugar} />
                <VitalInput label="BP Systolic" value={bpSys} onChange={setBpSys} placeholder="120" />
                <VitalInput label="BP Diastolic" value={bpDia} onChange={setBpDia} placeholder="80" />
              </div>
            </div>

            <AttachmentsSection appointmentId={a.id} canEdit />

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="rounded-lg bg-[#1f3d2b] px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#16301f] disabled:opacity-60"
          >
            {busy
              ? "Saving…"
              : mode === "visit"
                ? "Save & mark visited"
                : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function VitalInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        inputMode="decimal"
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
      />
    </label>
  );
}
