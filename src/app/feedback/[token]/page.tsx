"use client";

import { use, useEffect, useState, FormEvent } from "react";

type Loaded =
  | { kind: "loading" }
  | { kind: "ready"; name: string; phone: string }
  | { kind: "used" }
  | { kind: "submitted" }
  | { kind: "error"; message: string };

const API = (token: string) => `/api/feedback/public/${token}`;

export default function FeedbackPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [state, setState] = useState<Loaded>({ kind: "loading" });
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(API(token))
      .then(async res => {
        const data = await res.json();
        if (!res.ok) {
          setState({ kind: "error", message: data.error || "Invalid link" });
          return;
        }
        if (data.tokenUsed) {
          setState({ kind: "used" });
          return;
        }
        setState({ kind: "ready", name: data.name, phone: data.phone });
      })
      .catch(() => setState({ kind: "error", message: "Network error" }));
  }, [token]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (rating < 1) return;
    setSubmitting(true);
    try {
      const res = await fetch(API(token), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, reviewText: comment }),
      });
      const data = await res.json();
      if (!res.ok) {
        setState({ kind: "error", message: data.error || "Submission failed" });
        return;
      }
      setState({ kind: "submitted" });
    } catch {
      setState({ kind: "error", message: "Network error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8">
        <div className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            We&apos;re sorry to hear that
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            What went wrong?
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Help us put it right — your feedback goes directly to the team.
          </p>
        </div>

        {state.kind === "loading" && (
          <p className="text-sm text-slate-500">Loading…</p>
        )}

        {state.kind === "error" && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.message}
          </p>
        )}

        {state.kind === "used" && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            You&apos;ve already submitted feedback for this visit. Thank you!
          </p>
        )}

        {state.kind === "submitted" && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Thank you — your feedback has been recorded.
          </p>
        )}

        {state.kind === "ready" && (
          <form className="space-y-5" onSubmit={submit}>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500">Name</p>
                <p className="font-medium text-slate-800">{state.name}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500">Phone</p>
                <p className="font-medium text-slate-800">{state.phone}</p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">
                How would you rate the visit?
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { n: 1, label: "Poor" },
                  { n: 2, label: "Below expectations" },
                ].map(({ n, label }) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    className={`flex flex-col items-start gap-1 rounded-lg border px-3 py-2 text-left transition ${
                      rating === n
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                    aria-label={`${n} star${n > 1 ? "s" : ""}: ${label}`}
                  >
                    <span className="text-base">
                      {"★".repeat(n)}
                      <span className="text-slate-300">{"★".repeat(5 - n)}</span>
                    </span>
                    <span className="text-xs font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                What can we do better?
              </span>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={4}
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                placeholder="Tell us about your experience…"
              />
            </label>

            <button
              type="submit"
              disabled={submitting || rating < 1}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit feedback"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
