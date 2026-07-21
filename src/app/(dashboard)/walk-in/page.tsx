"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  DoorOpen,
  Link2,
  Loader2,
  Phone,
  UserPlus,
  X,
} from "lucide-react";
import RoleGuard from "@/components/RoleGuard";
import { PrescriptionClinicalFields } from "@/components/CreatePrescriptionModal";
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

type WalkInResult = { lead: { id: string; name: string }; createdPatient: boolean };

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
  // Step 1 — phone (drives the whole flow)
  const [phone, setPhone] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [searching, setSearching] = useState(false);
  const [lookupDone, setLookupDone] = useState(false);
  const [linked, setLinked] = useState<Match | null>(null);
  const [proceedNew, setProceedNew] = useState(false);

  // Step 2 — identity (new patient) / visit
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");

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

  const phoneDigits = phone.replace(/\D/g, "");
  const phoneValid = phoneDigits.length >= 10;

  // Debounced phone lookup. All setState is inside the async callback so the
  // effect body never sets state synchronously.
  useEffect(() => {
    if (linked) return;
    const t = setTimeout(() => {
      if (phoneDigits.length < 10) {
        setMatches([]);
        setLookupDone(false);
        setSearching(false);
        return;
      }
      setSearching(true);
      fetch(`/api/walk-in?phone=${encodeURIComponent(phone)}`, {
        headers: authHeaders(),
      })
        .then(r => r.json())
        .then((d: { matches?: Match[] }) => setMatches(d.matches ?? []))
        .catch(() => setMatches([]))
        .finally(() => {
          setSearching(false);
          setLookupDone(true);
        });
    }, 350);
    return () => clearTimeout(t);
  }, [phone, phoneDigits, linked]);

  const onPhoneChange = (v: string) => {
    setPhone(v);
    setProceedNew(false);
    if (linked && v !== linked.phone) setLinked(null);
  };

  const linkTo = (m: Match) => {
    setLinked(m);
    setPhone(m.phone);
    setName(m.name);
    setAge(m.age != null ? String(m.age) : "");
    setGender(m.gender ?? "");
    setMatches([]);
  };

  const unlink = () => {
    setLinked(null);
    setProceedNew(false);
    setName("");
    setAge("");
    setGender("");
  };

  const numOrNull = (s: string): number | null => {
    const t = s.trim();
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  };

  const resetForm = () => {
    setPhone("");
    setMatches([]);
    setLookupDone(false);
    setLinked(null);
    setProceedNew(false);
    setName("");
    setAge("");
    setGender("");
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
    setError(null);
  };

  // The identity is resolved once we know who this visit is for: an existing
  // patient was linked, or there's no match (so we'll create one).
  const isNew = !linked && (proceedNew || (phoneValid && lookupDone && matches.length === 0));
  const resolved = !!linked || isNew;
  const showLinkPrompt = !linked && !proceedNew && phoneValid && lookupDone && matches.length > 0;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!phoneValid) return setError("Enter a valid phone number.");
    const finalName = linked ? linked.name : name.trim();
    if (finalName.length < 2) return setError("Enter the patient's name.");
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
          name: finalName,
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

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1f3d2b]/10 text-[#1f3d2b]">
          <DoorOpen size={22} />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Walk-in
          </h1>
          <p className="text-sm text-slate-500">
            Record a patient who walked in — start with their phone number.
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
        {/* Step 1 — phone */}
        <section className="rounded-xl border border-slate-200/70 bg-white p-6">
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <Phone size={14} className="text-slate-400" />
              Phone number
            </span>
            <div className="relative">
              <input
                value={phone}
                onChange={e => onPhoneChange(e.target.value)}
                placeholder="Enter 10-digit number"
                inputMode="tel"
                autoFocus
                readOnly={!!linked}
                className={`${inputClass} text-base ${linked ? "bg-slate-50 text-slate-500" : ""}`}
              />
              {searching && (
                <Loader2
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400"
                />
              )}
            </div>
          </label>

          {/* Existing-patient link prompt */}
          {showLinkPrompt && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-800">
                {matches.length === 1
                  ? "A patient with this number already exists — link this visit to them?"
                  : `${matches.length} patients share this number — link this visit to one?`}
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
                onClick={() => setProceedNew(true)}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-amber-800 hover:underline"
              >
                <UserPlus size={12} /> Not listed — add as a new patient
              </button>
            </div>
          )}

          {/* Linked chip */}
          {linked && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <span className="inline-flex items-center gap-2 text-sm text-emerald-800">
                <Link2 size={15} />
                Linking to{" "}
                <span className="font-semibold">{linked.name}</span>
              </span>
              <button
                type="button"
                onClick={unlink}
                className="text-xs font-medium text-emerald-700 hover:underline"
              >
                Change
              </button>
            </div>
          )}

          {/* New-patient identity (only when creating) */}
          {isNew && (
            <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
              <p className="text-xs font-medium text-slate-500">
                No existing patient — a new record will be created.
              </p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <label className="block md:col-span-1">
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
            </div>
          )}

          {!resolved && !searching && (
            <p className="mt-3 text-xs text-slate-400">
              Enter a phone number to continue.
            </p>
          )}
        </section>

        {/* Step 2 — visit (revealed once the patient is resolved) */}
        {resolved && (
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
        )}

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {resolved && (
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
        )}
      </form>
    </div>
  );
}
