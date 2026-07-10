"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Sparkles, X } from "lucide-react";
import { useTour } from "@/components/tour/TourContext";

type StateResponse = {
  state: "pending" | "in_progress" | "done";
  resumable: boolean;
};

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${
    typeof window !== "undefined" ? localStorage.getItem("token") : ""
  }`,
});

// Slim banner that surfaces when the user started the tour but never
// finished it (browser closed, mid-tour navigation, etc.). Mounted in
// AppShell next to ImpersonationBanner.
export default function ResumeTourBanner() {
  const router = useRouter();
  const { start } = useTour();
  const { data, mutate } = useSWR<StateResponse>("/api/onboarding/state", {
    revalidateOnFocus: false,
  });
  const [dismissed, setDismissed] = useState(false);

  const handleResume = useCallback(() => {
    setDismissed(true);
    start();
    router.push("/dashboard");
  }, [router, start]);

  const handleSkip = useCallback(async () => {
    setDismissed(true);
    try {
      await fetch("/api/onboarding/skip", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ phase: "tour" }),
      });
    } finally {
      mutate();
    }
  }, [mutate]);

  if (dismissed || !data?.resumable) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-900">
      <p className="inline-flex items-center gap-2">
        <Sparkles size={14} className="text-blue-600" />
        You started a tour but didn&apos;t finish — want to pick it back up?
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleResume}
          className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-slate-800"
        >
          Resume tour
        </button>
        <button
          type="button"
          onClick={handleSkip}
          className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-white px-3 py-1 text-xs font-medium text-blue-700 shadow-sm transition-colors hover:bg-blue-100"
        >
          <X size={12} />
          Skip & clean up
        </button>
      </div>
    </div>
  );
}
