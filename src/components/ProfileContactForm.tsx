"use client";

import { FormEvent, useState } from "react";

type Status = "idle" | "submitting" | "success" | "error";

export default function ProfileContactForm({
  clientId,
  source,
}: {
  clientId: string;
  source?: string;
}) {
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
      <div className="rounded-lg bg-white p-8 text-gray-800 shadow-2xl">
        <p className="text-base font-semibold text-sky-700">
          Thank you — we&apos;ll be in touch shortly.
        </p>
        <p className="mt-2 text-sm text-gray-600">
          Your request has been received. Someone from our team will reach out
          to confirm your appointment.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-4 text-sm font-medium text-sky-700 hover:underline"
        >
          Submit another request
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white p-8 text-gray-800 shadow-2xl">
      <form className="space-y-6" onSubmit={submit}>
        <div>
          <label
            htmlFor="cf-name"
            className="block text-sm font-medium text-gray-700"
          >
            Full Name
          </label>
          <input
            type="text"
            id="cf-name"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            minLength={2}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-4 py-3 shadow-sm focus:border-sky-700 focus:ring-sky-700 sm:text-sm"
            placeholder="John Doe"
          />
        </div>
        <div>
          <label
            htmlFor="cf-phone"
            className="block text-sm font-medium text-gray-700"
          >
            Phone Number
          </label>
          <input
            type="tel"
            id="cf-phone"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            required
            minLength={10}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-4 py-3 shadow-sm focus:border-sky-700 focus:ring-sky-700 sm:text-sm"
            placeholder="+91 98765 43210"
          />
        </div>
        <div>
          <label
            htmlFor="cf-message"
            className="block text-sm font-medium text-gray-700"
          >
            How can we help?
          </label>
          <textarea
            id="cf-message"
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={4}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-4 py-3 shadow-sm focus:border-sky-700 focus:ring-sky-700 sm:text-sm"
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
            className="flex w-full justify-center rounded-md border border-transparent bg-sky-700 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-700 focus:ring-offset-2 disabled:opacity-60"
          >
            {status === "submitting" ? "Sending…" : "Request Appointment"}
          </button>
        </div>
      </form>
    </div>
  );
}
