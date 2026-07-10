"use client";

import { FormEvent, useEffect, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${
    typeof window !== "undefined" ? localStorage.getItem("token") : ""
  }`,
});

export default function AddPatientModal({ open, onClose, onCreated }: Props) {
  if (!open) return null;
  return <Form onClose={onClose} onCreated={onCreated} />;
}

function Form({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [email, setEmail] = useState("");
  const [area, setArea] = useState("");
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

    if (name.trim().length < 2) return setError("Name must be at least 2 characters");
    if (phone.trim().length < 10) return setError("Phone must be at least 10 characters");
    if (!age || !/^\d+$/.test(age)) return setError("Age is required");
    if (!gender) return setError("Gender is required");

    setBusy(true);
    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          age: Number(age),
          gender,
          email: email.trim() || undefined,
          area: area.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(
          typeof data?.error === "string" ? data.error : "Failed to add patient",
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-8 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <form
        onClick={e => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-lg max-h-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">New patient</h2>
            <p className="mt-1 text-xs text-slate-500">
              Created at status <code className="rounded bg-slate-100 px-1">qualified</code>. Name, phone, age, and gender are required.
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

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Name *" value={name} onChange={setName} autoFocus />
          <Field label="Phone *" value={phone} onChange={setPhone} inputMode="tel" placeholder="+91…" />
          <Field label="Age *" type="number" value={age} onChange={setAge} />
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Gender *
            </span>
            <select
              value={gender}
              onChange={e => setGender(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
            >
              <option value="">Select…</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
          </label>
          <Field label="Email" type="email" value={email} onChange={setEmail} />
          <Field label="Area" value={area} onChange={setArea} />
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
            className="rounded-lg bg-[#1f3d2b] px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#16301f] disabled:opacity-60"
          >
            {busy ? "Saving…" : "Add patient"}
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
        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
      />
    </label>
  );
}
