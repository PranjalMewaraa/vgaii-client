"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Plus, Search, Trash2, X } from "lucide-react";
import {
  RX_FREQUENCIES,
  RX_INSTRUCTIONS,
  DIAGNOSIS_STATUSES,
  ENCOUNTER_TYPES,
} from "@/lib/constants";
import type { PrescriptionItem } from "@/lib/validators/prescription";

// Records a new completed visit for a patient: diagnosis + observations +
// optional vitals + a structured medicine list. The medicine name field
// autocompletes against the bundled dataset via /api/medicines/search.

type MedRow = {
  key: string;
  name: string;
  composition?: string;
  dosage: string;
  frequency: string;
  timing: string;
  duration: string;
  instructions: string;
};

export type PrescriptionInitial = {
  encounterType?: string;
  diagnosis?: string;
  diagnosisCode?: string;
  diagnosisStatus?: string;
  observations?: string;
  medicines?: PrescriptionItem[];
};

type Props = {
  open: boolean;
  patient: { leadId: string; name: string; phone?: string };
  initial?: PrescriptionInitial;
  onClose: () => void;
  onCreated: () => void;
};

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${
    typeof window !== "undefined" ? localStorage.getItem("token") : ""
  }`,
});

let rowSeq = 0;
const nextKey = () => `m${rowSeq++}`;

const emptyRow = (): MedRow => ({
  key: nextKey(),
  name: "",
  dosage: "",
  frequency: "",
  timing: "",
  duration: "",
  instructions: "",
});

const rowsFromInitial = (initial?: PrescriptionInitial): MedRow[] => {
  const meds = initial?.medicines ?? [];
  if (meds.length === 0) return [emptyRow()];
  return meds.map(m => ({
    key: nextKey(),
    name: m.name ?? "",
    dosage: m.dosage ?? "",
    frequency: m.frequency ?? "",
    timing: m.timing ?? "",
    duration: m.duration ?? "",
    instructions: m.instructions ?? "",
  }));
};

export default function CreatePrescriptionModal({
  open,
  patient,
  initial,
  onClose,
  onCreated,
}: Props) {
  if (!open) return null;
  return (
    <Form
      patient={patient}
      initial={initial}
      onClose={onClose}
      onCreated={onCreated}
    />
  );
}

function Form({
  patient,
  initial,
  onClose,
  onCreated,
}: Omit<Props, "open">) {
  const [encounterType, setEncounterType] = useState(
    initial?.encounterType ?? "Follow-up Consultation",
  );
  const [diagnosis, setDiagnosis] = useState(initial?.diagnosis ?? "");
  const [diagnosisCode, setDiagnosisCode] = useState(initial?.diagnosisCode ?? "");
  const [diagnosisStatus, setDiagnosisStatus] = useState(
    initial?.diagnosisStatus ?? "Initial Entry",
  );
  const [observations, setObservations] = useState(initial?.observations ?? "");
  const [weight, setWeight] = useState("");
  const [sugar, setSugar] = useState("");
  const [bpSys, setBpSys] = useState("");
  const [bpDia, setBpDia] = useState("");
  const [rows, setRows] = useState<MedRow[]>(() => rowsFromInitial(initial));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const patchRow = (key: string, patch: Partial<MedRow>) =>
    setRows(rs => rs.map(r => (r.key === key ? { ...r, ...patch } : r)));
  const addRow = () => setRows(rs => [...rs, emptyRow()]);
  const removeRow = (key: string) =>
    setRows(rs => (rs.length === 1 ? rs : rs.filter(r => r.key !== key)));

  const numOrNull = (s: string): number | null => {
    const t = s.trim();
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const medicines = rows
      .filter(r => r.name.trim())
      .map(r => ({
        name: r.name.trim(),
        dosage: r.dosage.trim() || undefined,
        frequency: r.frequency.trim() || undefined,
        timing: r.timing.trim() || undefined,
        duration: r.duration.trim() || undefined,
        instructions: r.instructions.trim() || undefined,
      }));

    if (!diagnosis.trim() && medicines.length === 0) {
      return setError("Add a diagnosis or at least one medicine.");
    }

    setBusy(true);
    try {
      const res = await fetch("/api/prescriptions", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          leadId: patient.leadId,
          encounterType: encounterType.trim() || undefined,
          diagnosis: diagnosis.trim() || undefined,
          diagnosisCode: diagnosisCode.trim() || undefined,
          diagnosisStatus: diagnosisStatus.trim() || undefined,
          observations: observations.trim() || undefined,
          medicines,
          weightKg: numOrNull(weight),
          sugarMgDl: numOrNull(sugar),
          bpSystolic: numOrNull(bpSys),
          bpDiastolic: numOrNull(bpDia),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(
          typeof data?.error === "string"
            ? data.error
            : "Failed to save prescription",
        );
        return;
      }
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 px-4 py-8 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <form
        onClick={e => e.stopPropagation()}
        onSubmit={submit}
        className="my-auto w-full max-w-3xl rounded-xl border border-slate-200/70 bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200/70 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">
              Create prescription
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              New visit for{" "}
              <span className="font-medium text-slate-700">{patient.name}</span>
              , dated today.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          {/* Encounter + diagnosis */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Encounter type
              </span>
              <select
                value={encounterType}
                onChange={e => setEncounterType(e.target.value)}
                className={selectClass}
              >
                {ENCOUNTER_TYPES.map(t => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Diagnosis status
              </span>
              <select
                value={diagnosisStatus}
                onChange={e => setDiagnosisStatus(e.target.value)}
                className={selectClass}
              >
                {DIAGNOSIS_STATUSES.map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto]">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Diagnosis
              </span>
              <input
                value={diagnosis}
                onChange={e => setDiagnosis(e.target.value)}
                placeholder="e.g. Acute Purulent Sinusitis"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                ICD code
              </span>
              <input
                value={diagnosisCode}
                onChange={e => setDiagnosisCode(e.target.value)}
                placeholder="J01.90"
                className={`${inputClass} md:w-32`}
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Observations
            </span>
            <textarea
              value={observations}
              onChange={e => setObservations(e.target.value)}
              rows={3}
              placeholder="Symptoms, examination findings, progress notes…"
              className={inputClass}
            />
          </label>

          {/* Vitals */}
          <fieldset>
            <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Vitals (optional)
            </legend>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <MiniField label="Weight (kg)" value={weight} onChange={setWeight} />
              <MiniField label="Sugar (mg/dL)" value={sugar} onChange={setSugar} />
              <MiniField label="BP systolic" value={bpSys} onChange={setBpSys} />
              <MiniField label="BP diastolic" value={bpDia} onChange={setBpDia} />
            </div>
          </fieldset>

          {/* Medicines builder */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Prescribed medicines
              </span>
              <button
                type="button"
                onClick={addRow}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                <Plus size={12} /> Add medicine
              </button>
            </div>
            <div className="space-y-3">
              {rows.map((row, i) => (
                <MedicineRow
                  key={row.key}
                  row={row}
                  index={i}
                  canRemove={rows.length > 1}
                  onChange={patch => patchRow(row.key, patch)}
                  onRemove={() => removeRow(row.key)}
                />
              ))}
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-slate-200/70 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-[#1f3d2b] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#16301f] disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save prescription"}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-200/70 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100";
const selectClass = inputClass;

function MiniField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-slate-500">
        {label}
      </span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        inputMode="decimal"
        className={inputClass}
      />
    </label>
  );
}

function MedicineRow({
  row,
  index,
  canRemove,
  onChange,
  onRemove,
}: {
  row: MedRow;
  index: number;
  canRemove: boolean;
  onChange: (patch: Partial<MedRow>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200/70 bg-slate-50/50 p-3">
      <div className="flex items-start gap-2">
        <span className="mt-2 text-xs font-semibold text-slate-400">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <MedicineSearchInput
            value={row.name}
            composition={row.composition}
            onNameChange={name => onChange({ name, composition: undefined })}
            onPick={hit =>
              onChange({ name: hit.name, composition: hit.composition })
            }
          />
          <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
            <input
              value={row.dosage}
              onChange={e => onChange({ dosage: e.target.value })}
              placeholder="1 tab"
              className={miniInput}
              aria-label="Dosage"
            />
            <select
              value={row.frequency}
              onChange={e => onChange({ frequency: e.target.value })}
              className={miniInput}
              aria-label="Frequency"
            >
              <option value="">Frequency</option>
              {RX_FREQUENCIES.map(f => (
                <option key={f.code} value={f.code}>
                  {f.label}
                </option>
              ))}
            </select>
            <input
              value={row.timing}
              onChange={e => onChange({ timing: e.target.value })}
              placeholder="Morning, Night"
              className={miniInput}
              aria-label="Timing"
            />
            <input
              value={row.duration}
              onChange={e => onChange({ duration: e.target.value })}
              placeholder="5 Days"
              className={miniInput}
              aria-label="Duration"
            />
            <input
              value={row.instructions}
              onChange={e => onChange({ instructions: e.target.value })}
              placeholder="After Food"
              list="rx-instructions"
              className={miniInput}
              aria-label="Instructions"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          disabled={!canRemove}
          className="mt-1 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:hover:bg-transparent"
          aria-label="Remove medicine"
        >
          <Trash2 size={15} />
        </button>
      </div>
      <datalist id="rx-instructions">
        {RX_INSTRUCTIONS.map(t => (
          <option key={t} value={t} />
        ))}
      </datalist>
    </div>
  );
}

const miniInput =
  "w-full rounded-lg border border-slate-200/70 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none transition focus:border-green-500 focus:ring-1 focus:ring-green-100";

type MedicineHit = {
  id: string;
  name: string;
  composition: string;
  manufacturer: string;
  pack: string;
};

function MedicineSearchInput({
  value,
  composition,
  onNameChange,
  onPick,
}: {
  value: string;
  composition?: string;
  onNameChange: (v: string) => void;
  onPick: (hit: MedicineHit) => void;
}) {
  const [hits, setHits] = useState<MedicineHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  // Skip the fetch that would fire immediately after the user picks an item.
  const skipNext = useRef(false);

  useEffect(() => {
    // Just picked an item — the value change is our own, don't re-search.
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    const q = value.trim();
    // All setState happens inside the (async) timeout so the effect body
    // itself never sets state synchronously (react-hooks/set-state-in-effect).
    const t = setTimeout(() => {
      if (q.length < 2) {
        setHits([]);
        setOpen(false);
        return;
      }
      setLoading(true);
      fetch(`/api/medicines/search?q=${encodeURIComponent(q)}`, {
        headers: authHeaders(),
      })
        .then(r => r.json())
        .then((d: { medicines?: MedicineHit[] }) => {
          setHits(d.medicines ?? []);
          setOpen(true);
        })
        .catch(() => setHits([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [value]);

  // Close on outside click.
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = (hit: MedicineHit) => {
    skipNext.current = true;
    onPick(hit);
    setOpen(false);
    setHits([]);
  };

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <Search
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          value={value}
          onChange={e => onNameChange(e.target.value)}
          onFocus={() => hits.length > 0 && setOpen(true)}
          placeholder="Search medicine name…"
          className={`${inputClass} pl-9`}
          aria-label="Medicine name"
          autoComplete="off"
        />
      </div>
      {composition && (
        <p className="mt-1 pl-1 text-[11px] text-slate-500">{composition}</p>
      )}
      {open && (
        <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-xl">
          {loading && hits.length === 0 && (
            <li className="px-3 py-2 text-xs text-slate-400">Searching…</li>
          )}
          {!loading && hits.length === 0 && (
            <li className="px-3 py-2 text-xs text-slate-400">No matches.</li>
          )}
          {hits.map(hit => (
            <li key={hit.id}>
              <button
                type="button"
                onClick={() => pick(hit)}
                className="block w-full px-3 py-2 text-left transition-colors hover:bg-slate-50"
              >
                <span className="block text-sm font-medium text-slate-900">
                  {hit.name}
                </span>
                <span className="block truncate text-[11px] text-slate-500">
                  {[hit.composition, hit.pack].filter(Boolean).join(" · ")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
