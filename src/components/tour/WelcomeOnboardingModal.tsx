"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Sparkles } from "lucide-react";
import { useTour } from "@/components/tour/TourContext";

type StateResponse = {
  state: "pending" | "in_progress" | "done";
  role: string;
  eligible: boolean;
  demoSeeded: boolean;
  resumable: boolean;
};

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${
    typeof window !== "undefined" ? localStorage.getItem("token") : ""
  }`,
});

// First-login welcome modal. AppShell mounts this for every dashboard
// route; it self-gates on `eligible && state === "pending"` so non-
// CLIENT_ADMIN roles and returning users never see it.
export default function WelcomeOnboardingModal() {
  const router = useRouter();
  const { start } = useTour();
  const { data, mutate } = useSWR<StateResponse>("/api/onboarding/state", {
    revalidateOnFocus: false,
  });

  // `dismissed` is in-tab memory — once the user clicks Start or Skip we
  // hide the modal immediately without waiting for the SWR refetch.
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const show =
    !dismissed && !!data && data.eligible && data.state === "pending";

  const handleSkip = useCallback(async () => {
    setDismissed(true);
    try {
      await fetch("/api/onboarding/skip", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ phase: "welcome" }),
      });
    } finally {
      mutate();
    }
  }, [mutate]);

  const handleStart = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding/start", {
        method: "POST",
        headers: authHeaders(),
        body: "{}",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(
          typeof body?.error === "string"
            ? body.error
            : "Couldn't start the tour",
        );
        setBusy(false);
        return;
      }
      setDismissed(true);
      start();
      // Subsequent commits will wire <TourRunner> + cross-route nav.
      // For now, land on /dashboard so the user at least sees the demo
      // data populated.
      router.push("/dashboard");
      mutate();
    } catch {
      setError("Network error");
      setBusy(false);
    }
  }, [mutate, router, start]);

  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleSkip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show, handleSkip]);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-6"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-green-50 text-green-600 ring-1 ring-inset ring-green-100">
            <Sparkles size={20} />
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">
              Welcome to VGAII
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Take a 2-minute tour and we&apos;ll fill the app with sample
              leads, appointments, and a payment so the screens aren&apos;t
              empty. We&apos;ll clean it all up when you finish.
            </p>
          </div>
        </div>

        {error && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        )}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={handleSkip}
            className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={handleStart}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1f3d2b] px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#16301f] disabled:opacity-60"
          >
            <Sparkles size={14} />
            {busy ? "Setting up…" : "Start tour"}
          </button>
        </div>
      </div>
    </div>
  );
}
