"use client";

import { ReactNode, useState } from "react";
import useSWR from "swr";
import SlotPicker from "@/components/SlotPicker";
import type { BookingConfig } from "@/lib/validators/bookingConfig";

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${
    typeof window !== "undefined" ? localStorage.getItem("token") : ""
  }`,
});

// Slot-based booking for a known patient (used on the patient/lead detail
// modals). When self-hosted booking is disabled it renders `fallback` (the
// Cal.com embed / amber notice the page already had).
export default function SlotBookingPane({
  leadId,
  name,
  phone,
  email,
  onBooked,
  fallback,
}: {
  leadId?: string;
  name: string;
  phone: string;
  email?: string | null;
  onBooked: () => void;
  fallback?: ReactNode;
}) {
  const { data } = useSWR<{ config: BookingConfig }>("/api/booking/config");
  const config = data?.config;
  const [slot, setSlot] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (data && !config?.enabled) return <>{fallback}</>;
  if (!config) return <p className="text-sm text-slate-500">Loading…</p>;

  const book = async () => {
    if (!slot) {
      setError("Pick a slot");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          name,
          phone,
          email: email || undefined,
          date: slot,
          leadId,
          durationMin: config.slotMinutes,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(typeof d.error === "string" ? d.error : "Booking failed");
        return;
      }
      setSlot("");
      onBooked();
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <SlotPicker value={slot} onChange={setSlot} advanceDays={config.advanceDays} />
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={book}
          disabled={busy || !slot}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {busy ? "Booking…" : "Confirm booking"}
        </button>
      </div>
    </div>
  );
}
