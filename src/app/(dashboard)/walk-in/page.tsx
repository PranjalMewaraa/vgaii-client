"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, DoorOpen, Link2, UserPlus, X } from "lucide-react";
import RoleGuard from "@/components/RoleGuard";
import {
  PrescriptionClinicalFields,
} from "@/components/CreatePrescriptionModal";
import {
  MedicineBuilder,
  medRowsFrom,
  medRowsToItems,
  inputClass,
  type MedRow,
} from "@/components/prescription-fields";

type Match = {
  id: string;
  name: string;
  phone: string;
  age?: number | null;
  gender?: string | null;
  status?: string;
};

type WalkInResult = {
  lead: { id: string; name: string };
  createdPatient: boolean;
};

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${
    typeof window !== "undefined" ? localStorage.getItem("token") : ""
  }`,
});

export default function WalkInPage() {
  return (
    <RoleGuard module="appointments">
      <WalkInPageInner />
    </RoleGuard>
  );
}

function WalkInPageInner() {
  // Patient identity
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");

  // Phone-match lookup + link decision
  const [matches, setMatches] = useState<Match[]>([]);
  const [linked, setLinked] = useState<Match | null>(null);
  const [dismissedLink, setDismissedLink] = useState(false);

  // Clinical
  const [encounterType, setEncounterType] = useState("Primary Consultation");
  const [diagnosis, setDiagnosis] = useState("");
  const [diagnosisCode, setDiagnosisCode] = useState("");
  const [diagnosisStatus, setDiagnosisStatus] = useState("Initial Entry");
  const [observations, setObservations] = useState("");
  const [weight, setWeight] = useState("");
  const [sugar, setSugar] = useState("");
  const [bpSys, setBpSys] = useState("");
  const [bpDia, setBpDia] = useState("");
  const [rows, setRows] = useState<MedRow[]>(() => medRowsFrom());

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<WalkInResult | null>(null);

  // Debounced lookup for an existing patient with this number. All setState
  // runs inside the async callback so the effect body never sets state
  // synchronously.
  useEffect(() => {
    if (linked) return; // already linked — don't keep searching
    const t = setTimeout(() => {
      const digits = phone.replace(/\D/g, "");
      if (digits.length < 4) {
        setMatches([]);
        return;
      }
      fetch(`/api/walk-in?phone=${encodeURIComponent(phone)}`, {
        headers: authHeaders(),
      })
        .then(r => r.json())
        .then((d: { matches?: Match[] }) => setMatches(d.matches ?? []))
        .catch(() => setMatches([]));
    }, 300);
    return () => clearTimeout(t);
  }, [phone, linked]);

  const linkTo = (m: Match) => {
    setLinked(m);
    setName(m.name);
    setPhone(m.phone);
    setAge(m.age != null ? String(m.age) : "");
    setGender(m.gender ?? "");
    setMatches([]);
  };

  const unlink = () => {
    setLinked(null);
    setDismissedLink(false);
  };

  const numOrNull = (s: string): number | null => {
    const t = s.trim();
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  };

  const resetForm = () => {
    setName("");
    setPhone("");
    setAge("");
    setGender("");
    setMatches([]);
    setLinked(null);
    setDismissedLink(false);
    setEncounterType("Primary Consultation");
    setDiagnosis("");
    setDiagnosisCode("");
    setDiagnosisStatus("Initial Entry");
    setObservations("");
    setWeight("");
    setSugar("");
    setBpSys("");
    setBpDia("");
    setRows(medRowsFrom());
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 2) return setError("Enter the patient's name.");
    if (phone.replace(/\D/g, "").length < 10) {
      return setError("Enter a valid phone number.");
    }
    const medicines = medRowsToItems(rows);
    if (!diagnosis.trim() && medicines.length === 0) {
      return setError("Add a diagnosis or at least one medicine.");
    }

    setBusy(true);
    try {
      const res = await fetch("/api/walk-in", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          age: numOrNull(age),
          gender: gender || undefined,
          linkLeadId: linked?.id,
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
        setError(typeof data?.error === "string" ? data.error : "Failed to record walk-in");
        return;
      }
      setDone({ lead: data.lead, createdPatient: data.createdPatient });
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setBusy(false);
    }
  };

  const showLinkPrompt = !linked && !dismissedLink && matches.length > 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1f3d2b]/10 text-[#1f3d2b]">
          <DoorOpen size={22} />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Walk-in
          </h1>
          <p className="text-sm text-slate-500">
            Record a patient who walked in — no appointment needed.
          </p>
        </div>
      </div>

      {done && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">
                Walk-in recorded for {done.lead.name}
                {done.createdPatient ? " (new patient created)" : ""}.
              </p>
              <Link
                href={`/patients/${done.lead.id}?tab=medical-history`}
                className="text-xs font-medium text-emerald-700 underline"
              >
                Open patient record
              </Link>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDone(null)}
            className="rounded-md p-1 text-emerald-600 hover:bg-emerald-100"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <form onSubmit={submit} className="space-y-6">
        {/* Patient */}
        <section className="rounded-xl border border-slate-200/70 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold tracking-tight text-slate-900">
              Patient
            </h2>
            {linked && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-100">
                <Link2 size={12} /> Linked to existing patient
                <button
                  type="button"
                  onClick={unlink}
                  className="ml-1 text-emerald-600 hover:text-emerald-800"
                  aria-label="Unlink"
                >
                  <X size={12} />
                </button>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Name *
              </span>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Patient name"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Phone *
              </span>
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="10-digit number"
                inputMode="tel"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Age
              </span>
              <input
                value={age}
                onChange={e => setAge(e.target.value)}
                inputMode="numeric"
                placeholder="—"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Gender
              </span>
              <select
                value={gender}
                onChange={e => setGender(e.target.value)}
                className={inputClass}
              >
                <option value="">—</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </label>
          </div>

          {/* Existing-patient link prompt */}
          {showLinkPrompt && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-800">
                {matches.length === 1
                  ? "A patient with this number already exists:"
                  : `${matches.length} patients with this number already exist:`}
              </p>
              <ul className="mt-2 space-y-1.5">
                {matches.map(m => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-900">
                        {m.name}
                      </span>
                      <span className="text-xs text-slate-500">
                        {m.phone}
                        {m.status ? ` · ${m.status.replace(/_/g, " ")}` : ""}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => linkTo(m)}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#1f3d2b] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#16301f]"
                    >
                      <Link2 size={12} /> Link
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => setDismissedLink(true)}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-amber-800 hover:underline"
              >
                <UserPlus size={12} /> No, create a new patient
              </button>
            </div>
          )}
        </section>

        {/* Visit */}
        <section className="rounded-xl border border-slate-200/70 bg-white p-6">
          <h2 className="mb-4 text-base font-semibold tracking-tight text-slate-900">
            Visit details
          </h2>
          <div className="space-y-5">
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
          </div>
        </section>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={resetForm}
            className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Clear
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-[#1f3d2b] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#16301f] disabled:opacity-60"
          >
            {busy ? "Recording…" : "Record walk-in"}
          </button>
        </div>
      </form>
    </div>
  );
}
