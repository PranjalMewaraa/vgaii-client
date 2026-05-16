"use client";

import { FormEvent, useEffect, useState } from "react";

// Edit a patient's profile fields. Phone is intentionally read-only —
// it's the unique link key (Lead ↔ Appointment ↔ Payment all join on
// phoneNormalized), so changing it would silently disconnect the
// patient from their own history. If a patient gets a new number,
// capture them as a fresh lead.

type Patient = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  age?: number | null;
  gender?: string | null;
  area?: string | null;
};

type Props = {
  open: boolean;
  patient: Patient;
  onClose: () => void;
  onSaved: () => void;
};

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${
    typeof window !== "undefined" ? localStorage.getItem("token") : ""
  }`,
});

export default function EditPatientModal({
  open,
  patient,
  onClose,
  onSaved,
}: Props) {
  if (!open) return null;
  return <Form patient={patient} onClose={onClose} onSaved={onSaved} />;
}

function Form({
  patient,
  onClose,
  onSaved,
}: {
  patient: Patient;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(patient.name ?? "");
  const [email, setEmail] = useState(patient.email ?? "");
  const [age, setAge] = useState(
    patient.age != null ? String(patient.age) : "",
  );
  const [gender, setGender] = useState(patient.gender ?? "");
  const [area, setArea] = useState(patient.area ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 2) {
      return setError("Name must be at least 2 characters");
    }
    let ageNum: number | null = null;
    if (age.trim()) {
      if (!/^\d+$/.test(age.trim())) {
        return setError("Age must be a whole number");
      }
      ageNum = Number(age);
      if (ageNum < 0 || ageNum > 150) {
        return setError("Age must be between 0 and 150");
      }
    }

    setBusy(true);
    try {
      const res = await fetch(`/api/leads/${patient.id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({
          name: name.trim(),
          // Empty strings flow through as "clear this field" — the API
          // converts them to NULL on optional columns.
          email: email.trim(),
          age: ageNum,
          gender,
          area: area.trim(),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(
          typeof data?.error === "string"
            ? data.error
            : "Failed to update patient",
        );
        return;
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <form
        onClick={e => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-lg max-h-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Edit patient</h2>
            <p className="text-xs text-slate-500">
              Update the patient&apos;s profile. Phone number is locked
              because it links the patient to their appointments and
              payments.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field
            label="Name *"
            value={name}
            onChange={setName}
            autoFocus
          />
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Phone (locked)
            </span>
            <input
              value={patient.phone}
              readOnly
              disabled
              className="mt-1 w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 outline-none"
              title="Phone number is the unique key linking this patient to their history. To change it, create a new patient record."
            />
          </label>
          <Field
            label="Age"
            type="number"
            value={age}
            onChange={setAge}
            inputMode="numeric"
          />
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Gender
            </span>
            <select
              value={gender}
              onChange={e => setGender(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">—</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
          </label>
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="patient@example.com"
          />
          <Field label="Area" value={area} onChange={setArea} />
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  inputMode,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  inputMode?: "tel" | "numeric" | "email" | "text";
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        autoFocus={autoFocus}
        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
      />
    </label>
  );
}
