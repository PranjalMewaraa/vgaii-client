"use client";

import { FormEvent, useEffect, useState } from "react";
import { X } from "lucide-react";
import { DIAGNOSIS_STATUSES, ENCOUNTER_TYPES } from "@/lib/constants";
import type { PrescriptionItem } from "@/lib/validators/prescription";
import {
  MedicineBuilder,
  medRowsFrom,
  medRowsToItems,
  inputClass,
  type MedRow,
} from "@/components/prescription-fields";

// Records a visit for a patient: diagnosis + observations + optional vitals +
// a structured medicine list (CSV-backed typeahead). Depending on props it
// POSTs a new visit, or PATCHes an existing appointment (Mark visited / Edit).

export type PrescriptionInitial = {
  encounterType?: string;
  diagnosis?: string;
  diagnosisCode?: string;
  diagnosisStatus?: string;
  observations?: string;
  medicines?: PrescriptionItem[];
  weightKg?: number | null;
  sugarMgDl?: number | null;
  bpSystolic?: number | null;
  bpDiastolic?: number | null;
};

type Props = {
  open: boolean;
  // leadId is required to create a new visit; optional when completing an
  // existing appointment (which is targeted by appointmentId instead).
  patient: { leadId?: string; name: string; phone?: string };
  initial?: PrescriptionInitial;
  // When set, saving PATCHes this appointment instead of creating a new visit
  // (POST). "complete" also flips status → completed (Mark visited); "edit"
  // only updates the clinical fields, leaving status/date untouched.
  appointmentId?: string;
  mode?: "create" | "complete" | "edit";
  onClose: () => void;
  onCreated: () => void;
};

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${
    typeof window !== "undefined" ? localStorage.getItem("token") : ""
  }`,
});

export default function CreatePrescriptionModal({
  open,
  patient,
  initial,
  appointmentId,
  mode,
  onClose,
  onCreated,
}: Props) {
  if (!open) return null;
  return (
    <Form
      patient={patient}
      initial={initial}
      appointmentId={appointmentId}
      mode={mode}
      onClose={onClose}
      onCreated={onCreated}
    />
  );
}

const vitalStr = (v: number | null | undefined) =>
  v === null || v === undefined ? "" : String(v);

function Form({
  patient,
  initial,
  appointmentId,
  mode,
  onClose,
  onCreated,
}: Omit<Props, "open">) {
  const isPatch = !!appointmentId;
  const isEdit = isPatch && mode === "edit";
  const isComplete = isPatch && !isEdit; // Mark visited

  const [encounterType, setEncounterType] = useState(
    initial?.encounterType ?? "Follow-up Consultation",
  );
  const [diagnosis, setDiagnosis] = useState(initial?.diagnosis ?? "");
  const [diagnosisCode, setDiagnosisCode] = useState(initial?.diagnosisCode ?? "");
  const [diagnosisStatus, setDiagnosisStatus] = useState(
    initial?.diagnosisStatus ?? "Initial Entry",
  );
  const [observations, setObservations] = useState(initial?.observations ?? "");
  const [weight, setWeight] = useState(vitalStr(initial?.weightKg));
  const [sugar, setSugar] = useState(vitalStr(initial?.sugarMgDl));
  const [bpSys, setBpSys] = useState(vitalStr(initial?.bpSystolic));
  const [bpDia, setBpDia] = useState(vitalStr(initial?.bpDiastolic));
  const [rows, setRows] = useState<MedRow[]>(() => medRowsFrom(initial?.medicines));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const numOrNull = (s: string): number | null => {
    const t = s.trim();
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const medicines = medRowsToItems(rows);
    if (!diagnosis.trim() && medicines.length === 0) {
      return setError("Add a diagnosis or at least one medicine.");
    }

    setBusy(true);
    try {
      const clinical = {
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
      };
      const res = isPatch
        ? await fetch(`/api/appointments/${appointmentId}`, {
            method: "PATCH",
            headers: authHeaders(),
            // "complete" flips status; "edit" leaves status/date as-is.
            body: JSON.stringify(
              isComplete ? { status: "completed", ...clinical } : clinical,
            ),
          })
        : await fetch("/api/prescriptions", {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({ leadId: patient.leadId, ...clinical }),
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
              {isEdit
                ? "Edit visit"
                : isComplete
                  ? "Mark visited"
                  : "Create prescription"}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {isEdit
                ? "Update the record for "
                : isComplete
                  ? "Complete the visit for "
                  : "New visit for "}
              <span className="font-medium text-slate-700">{patient.name}</span>
              {isEdit ? "." : isComplete ? " — record diagnosis & prescription." : ", dated today."}
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
          <PrescriptionClinicalFields
            encounterType={encounterType}
            setEncounterType={setEncounterType}
            diagnosis={diagnosis}
            setDiagnosis={setDiagnosis}
            diagnosisCode={diagnosisCode}
            setDiagnosisCode={setDiagnosisCode}
            diagnosisStatus={diagnosisStatus}
            setDiagnosisStatus={setDiagnosisStatus}
            observations={observations}
            setObservations={setObservations}
            weight={weight}
            setWeight={setWeight}
            sugar={sugar}
            setSugar={setSugar}
            bpSys={bpSys}
            setBpSys={setBpSys}
            bpDia={bpDia}
            setBpDia={setBpDia}
          />

          <MedicineBuilder rows={rows} onChange={setRows} />

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
            {busy
              ? "Saving…"
              : isEdit
                ? "Save changes"
                : isComplete
                  ? "Save & mark visited"
                  : "Save prescription"}
          </button>
        </div>
      </form>
    </div>
  );
}

// The encounter/diagnosis/observations/vitals block. Shared between the modal
// and the Walk-in page so both capture identical clinical data.
export function PrescriptionClinicalFields({
  encounterType,
  setEncounterType,
  diagnosis,
  setDiagnosis,
  diagnosisCode,
  setDiagnosisCode,
  diagnosisStatus,
  setDiagnosisStatus,
  observations,
  setObservations,
  weight,
  setWeight,
  sugar,
  setSugar,
  bpSys,
  setBpSys,
  bpDia,
  setBpDia,
}: {
  encounterType: string;
  setEncounterType: (v: string) => void;
  diagnosis: string;
  setDiagnosis: (v: string) => void;
  diagnosisCode: string;
  setDiagnosisCode: (v: string) => void;
  diagnosisStatus: string;
  setDiagnosisStatus: (v: string) => void;
  observations: string;
  setObservations: (v: string) => void;
  weight: string;
  setWeight: (v: string) => void;
  sugar: string;
  setSugar: (v: string) => void;
  bpSys: string;
  setBpSys: (v: string) => void;
  bpDia: string;
  setBpDia: (v: string) => void;
}) {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">
            Encounter type
          </span>
          <select
            value={encounterType}
            onChange={e => setEncounterType(e.target.value)}
            className={inputClass}
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
            className={inputClass}
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
    </>
  );
}

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
