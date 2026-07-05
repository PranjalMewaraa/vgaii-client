"use client";

import { useEffect, useState } from "react";
import {
  WEEKDAY_KEYS,
  type BookingConfig,
  type BookingRange,
} from "@/lib/validators/bookingConfig";

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${
    typeof window !== "undefined" ? localStorage.getItem("token") : ""
  }`,
});

const DAY_LABEL: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

const COMMON_TZ = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Karachi",
  "Asia/Dhaka",
  "Asia/Singapore",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
  "Australia/Sydney",
];

const SLOT_OPTIONS = [5, 10, 15, 20, 30, 60];

export default function BookingSettings() {
  const [cfg, setCfg] = useState<BookingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/booking/config", { headers: authHeaders() })
      .then(r => r.json())
      .then(d => {
        if (d.config) setCfg(d.config as BookingConfig);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
        Loading booking settings…
      </section>
    );
  }
  if (!cfg) return null;

  const patch = (p: Partial<BookingConfig>) => setCfg(c => (c ? { ...c, ...p } : c));
  const setDay = (day: string, ranges: BookingRange[]) =>
    setCfg(c => (c ? { ...c, hours: { ...c.hours, [day]: ranges } } : c));

  const tzOptions = COMMON_TZ.includes(cfg.timezone)
    ? COMMON_TZ
    : [cfg.timezone, ...COMMON_TZ];

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/booking/config", {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(cfg),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(
          d?.error?.issues?.length
            ? d.error.issues[0]?.message ?? "Save failed"
            : typeof d?.error === "string"
              ? d.error
              : "Save failed",
        );
        return;
      }
      setCfg(d.config as BookingConfig);
      setSavedAt(Date.now());
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Booking</h2>
          <p className="text-xs text-slate-500">
            Self-hosted appointment slots. When on, staff book patients
            straight into your available slots.
          </p>
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={cfg.enabled}
            onChange={e => patch({ enabled: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span>{cfg.enabled ? "Enabled" : "Disabled"}</span>
        </label>
      </div>

      <div className="space-y-4 px-4 py-3">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Timezone">
            <select
              value={cfg.timezone}
              onChange={e => patch({ timezone: e.target.value })}
              className={selectCls}
            >
              {tzOptions.map(tz => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Slot length (min)">
            <select
              value={cfg.slotMinutes}
              onChange={e => patch({ slotMinutes: Number(e.target.value) })}
              className={selectCls}
            >
              {SLOT_OPTIONS.map(n => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Min notice (min)">
            <input
              type="number"
              min={0}
              value={cfg.leadTimeMinutes}
              onChange={e =>
                patch({ leadTimeMinutes: Number(e.target.value) || 0 })
              }
              className={selectCls}
            />
          </Field>
          <Field label="Book ahead (days)">
            <input
              type="number"
              min={1}
              max={365}
              value={cfg.advanceDays}
              onChange={e => patch({ advanceDays: Number(e.target.value) || 1 })}
              className={selectCls}
            />
          </Field>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Working hours
          </p>
          <div className="mt-2 space-y-2">
            {WEEKDAY_KEYS.map(day => (
              <DayRow
                key={day}
                day={day}
                ranges={cfg.hours[day]}
                onChange={ranges => setDay(day, ranges)}
              />
            ))}
          </div>
        </div>

        <BlackoutEditor
          dates={cfg.blackoutDates}
          onChange={dates => patch({ blackoutDates: dates })}
        />
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-4 py-2">
        <span className="text-xs text-slate-500">
          {error ? null : savedAt ? "Saved." : "Changes apply after save."}
        </span>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save booking settings"}
        </button>
      </div>
      {error && (
        <p className="border-t border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </section>
  );
}

function DayRow({
  day,
  ranges,
  onChange,
}: {
  day: string;
  ranges: BookingRange[];
  onChange: (ranges: BookingRange[]) => void;
}) {
  const update = (i: number, field: "open" | "close", val: string) =>
    onChange(ranges.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)));
  const remove = (i: number) => onChange(ranges.filter((_, idx) => idx !== i));
  const add = () => onChange([...ranges, { open: "10:00", close: "13:00" }]);

  return (
    <div className="flex flex-wrap items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <span className="w-24 pt-1.5 text-sm font-medium text-slate-700">
        {DAY_LABEL[day]}
      </span>
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {ranges.length === 0 && (
          <span className="text-xs italic text-slate-400">Closed</span>
        )}
        {ranges.map((r, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1"
          >
            <input
              type="time"
              value={r.open}
              onChange={e => update(i, "open", e.target.value)}
              className="bg-transparent text-xs text-slate-700 outline-none"
            />
            <span className="text-slate-400">–</span>
            <input
              type="time"
              value={r.close}
              onChange={e => update(i, "close", e.target.value)}
              className="bg-transparent text-xs text-slate-700 outline-none"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="ml-1 text-slate-400 hover:text-red-600"
              aria-label="Remove range"
            >
              ✕
            </button>
          </span>
        ))}
        <button
          type="button"
          onClick={add}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
        >
          + Add
        </button>
      </div>
    </div>
  );
}

function BlackoutEditor({
  dates,
  onChange,
}: {
  dates: string[];
  onChange: (dates: string[]) => void;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
        Blackout dates (fully closed)
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {dates.map((d, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1"
          >
            <input
              type="date"
              value={d}
              onChange={e =>
                onChange(dates.map((x, idx) => (idx === i ? e.target.value : x)))
              }
              className="bg-transparent text-xs text-slate-700 outline-none"
            />
            <button
              type="button"
              onClick={() => onChange(dates.filter((_, idx) => idx !== i))}
              className="text-slate-400 hover:text-red-600"
              aria-label="Remove date"
            >
              ✕
            </button>
          </span>
        ))}
        <button
          type="button"
          onClick={() => {
            const t = new Date();
            const v = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
            onChange([...dates, v]);
          }}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
        >
          + Add date
        </button>
      </div>
    </div>
  );
}

const selectCls =
  "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}
