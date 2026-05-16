"use client";

import { FormEvent, useState } from "react";

type Status = "idle" | "submitting" | "success" | "error";

// Each visual template gets a matching form variant so the form
// doesn't stand out from its surrounding section. The classic variant
// is the original sky-700 styling — kept as the default so any caller
// that doesn't pass a variant still works.
export type ContactFormVariant = "classic" | "premium" | "clinical";

type VariantClasses = {
  card: string;
  label: string;
  input: string;
  successHeading: string;
  successLink: string;
  button: string;
};

const VARIANTS: Record<ContactFormVariant, VariantClasses> = {
  classic: {
    card: "rounded-lg bg-white p-8 text-gray-800 shadow-2xl",
    label: "block text-sm font-medium text-gray-700",
    input:
      "mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-4 py-3 shadow-sm focus:border-sky-700 focus:ring-sky-700 sm:text-sm",
    successHeading: "text-base font-semibold text-sky-700",
    successLink: "mt-4 text-sm font-medium text-sky-700 hover:underline",
    button:
      "flex w-full justify-center rounded-md border border-transparent bg-sky-700 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-700 focus:ring-offset-2 disabled:opacity-60",
  },
  // Premium = slate-900 button, accent-blue focus, pill-ish corners.
  premium: {
    card:
      "rounded-3xl bg-white p-8 lg:p-10 text-slate-900 shadow-2xl shadow-black/40 border border-slate-100",
    label:
      "block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2",
    input:
      "block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3.5 text-sm placeholder:text-slate-400 transition-all focus:border-sky-600 focus:ring-1 focus:ring-sky-600",
    successHeading: "text-base font-semibold text-slate-900",
    successLink: "mt-4 text-sm font-medium text-slate-900 hover:underline",
    button:
      "flex w-full justify-center rounded-xl bg-slate-900 px-4 py-4 text-xs font-semibold uppercase tracking-wider text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-60",
  },
  // Clinical = deep teal button, mint accents, sharp corners.
  clinical: {
    card: "rounded-xl bg-white p-8 text-stone-800 shadow-xl",
    label: "block text-xs font-bold uppercase text-stone-500 mb-1",
    input:
      "block w-full rounded border border-stone-200 bg-stone-50 px-4 py-3 text-sm transition focus:border-teal-700 focus:bg-white focus:outline-none",
    successHeading: "text-base font-semibold text-teal-700",
    successLink: "mt-4 text-sm font-medium text-teal-700 hover:underline",
    button:
      "flex w-full justify-center rounded bg-teal-700 px-4 py-3.5 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-2 disabled:opacity-60",
  },
};

export default function ProfileContactForm({
  clientId,
  source,
  variant = "classic",
}: {
  clientId: string;
  source?: string;
  variant?: ContactFormVariant;
}) {
  const v = VARIANTS[variant];
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/p/${clientId}/lead`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          message: message.trim() || undefined,
          source: source || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg =
          typeof data?.error === "string"
            ? data.error
            : "Couldn't submit your request. Please try again.";
        setErrorMessage(msg);
        setStatus("error");
        return;
      }
      setStatus("success");
      setName("");
      setPhone("");
      setMessage("");
    } catch {
      setErrorMessage("Network error. Please try again.");
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className={v.card}>
        <p className={v.successHeading}>
          Thank you — we&apos;ll be in touch shortly.
        </p>
        <p className="mt-2 text-sm text-gray-600">
          Your request has been received. Someone from our team will reach out
          to confirm your appointment.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className={v.successLink}
        >
          Submit another request
        </button>
      </div>
    );
  }

  return (
    <div className={v.card}>
      <form className="space-y-6" onSubmit={submit}>
        <div>
          <label htmlFor="cf-name" className={v.label}>
            Full Name
          </label>
          <input
            type="text"
            id="cf-name"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            minLength={2}
            className={v.input}
            placeholder="John Doe"
          />
        </div>
        <div>
          <label htmlFor="cf-phone" className={v.label}>
            Phone Number
          </label>
          <input
            type="tel"
            id="cf-phone"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            required
            minLength={10}
            className={v.input}
            placeholder="+91 98765 43210"
          />
        </div>
        <div>
          <label htmlFor="cf-message" className={v.label}>
            How can we help?
          </label>
          <textarea
            id="cf-message"
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={4}
            className={v.input}
            placeholder="Briefly describe your concern or inquiry…"
          />
        </div>

        {errorMessage && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        )}

        <div>
          <button
            type="submit"
            disabled={status === "submitting"}
            className={v.button}
          >
            {status === "submitting" ? "Sending…" : "Request Appointment"}
          </button>
        </div>
      </form>
    </div>
  );
}
