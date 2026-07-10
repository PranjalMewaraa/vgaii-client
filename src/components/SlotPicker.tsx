"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";

type Slot = {
  startUtc: string;
  localLabel: string;
  available: boolean;
  reason?: "past" | "booked";
};

type AvailabilityResp = {
  enabled: boolean;
  date?: string;
  timezone?: string;
  slotMinutes?: number;
  slots: Slot[];
};

const pad = (n: number) => String(n).padStart(2, "0");

// Next N browser-local dates as YYYY-MM-DD. The availability API interprets
// each date in the clinic timezone; for v1 we assume staff are in (or near)
// the clinic's timezone, so the day chips line up.
const nextDates = (n: number): string[] => {
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(base.getTime() + i * 86_400_000);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });
};

const chipLabel = (dateStr: string, i: number): string => {
  if (i === 0) return "Today";
  if (i === 1) return "Tomorrow";
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
  });
};

// Date strip + available-slot grid. `value` is the selected slot's ISO UTC
// start; `onChange` emits the chosen slot's ISO UTC start.
export default function SlotPicker({
  value,
  onChange,
  advanceDays = 30,
}: {
  value: string;
  onChange: (isoUtc: string) => void;
  advanceDays?: number;
}) {
  const dates = useMemo(
    () => nextDates(Math.max(1, Math.min(advanceDays, 14))),
    [advanceDays],
  );
  const [date, setDate] = useState(dates[0]);

  const { data, isLoading } = useSWR<AvailabilityResp>(
    `/api/booking/availability?date=${date}`,
  );
  const slots = data?.slots ?? [];

  return (
    <div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {dates.map((d, i) => (
          <button
            key={d}
            type="button"
            onClick={() => setDate(d)}
            className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium shadow-sm transition ${
              d === date
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {chipLabel(d, i)}
          </button>
        ))}
      </div>

      <div className="mt-2 min-h-[3rem]">
        {isLoading ? (
          <p className="py-3 text-xs text-slate-500">Loading slots…</p>
        ) : data && !data.enabled ? (
          <p className="py-3 text-xs text-slate-500">
            Self-booking isn&apos;t enabled. Use Manual entry, or enable it in
            Settings → Booking.
          </p>
        ) : slots.length === 0 ? (
          <p className="py-3 text-xs text-slate-500">
            No slots this day (clinic closed or fully booked).
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
            {slots.map(s => {
              const selected = value === s.startUtc;
              return (
                <button
                  key={s.startUtc}
                  type="button"
                  disabled={!s.available}
                  onClick={() => onChange(s.startUtc)}
                  title={
                    s.reason === "booked"
                      ? "Already booked"
                      : s.reason === "past"
                        ? "Too soon / past"
                        : undefined
                  }
                  className={`rounded-lg border px-2 py-1.5 text-xs font-medium shadow-sm transition ${
                    selected
                      ? "border-blue-600 bg-blue-600 text-white"
                      : s.available
                        ? "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                        : "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300 line-through"
                  }`}
                >
                  {s.localLabel}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
