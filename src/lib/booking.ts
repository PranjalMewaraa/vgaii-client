import {
  bookingConfigSchema,
  DEFAULT_BOOKING_CONFIG,
  WEEKDAY_KEYS,
  type BookingConfig,
} from "@/lib/validators/bookingConfig";

// Pure booking helpers — no Prisma, no env. The caller fetches existing
// appointments and passes them in, so this stays unit-testable. ALL timezone
// math lives here; everywhere else treats appointment dates as UTC instants.

export type ComputedSlot = {
  startUtc: string; // ISO
  endUtc: string; // ISO
  localLabel: string; // e.g. "10:30 AM" in the clinic timezone
  available: boolean;
  reason?: "past" | "booked";
};

export type ExistingAppt = {
  startUtc: Date | string;
  durationMin: number | null;
};

// Parse the stored JSON (or null/garbage) into a usable config, falling back
// to the disabled default. Centralizes the null-handling.
export const getBookingConfig = (raw: unknown): BookingConfig => {
  const parsed = bookingConfigSchema.safeParse(raw);
  return parsed.success ? parsed.data : DEFAULT_BOOKING_CONFIG;
};

// Offset (ms) that `tz` is ahead of UTC at the given instant.
const tzOffsetMs = (instant: Date, tz: string): number => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const m: Record<string, number> = {};
  for (const p of parts) if (p.type !== "literal") m[p.type] = Number(p.value);
  const asUtc = Date.UTC(m.year, m.month - 1, m.day, m.hour, m.minute, m.second);
  return asUtc - instant.getTime();
};

// Convert a clinic-local wall-clock (date + HH:mm in `tz`) to a UTC instant.
// Two-pass to settle DST boundaries; exact in one pass for fixed-offset zones
// like IST.
export const zonedWallTimeToUtc = (
  dateLocal: string,
  hhmm: string,
  tz: string,
): Date => {
  const [y, mo, d] = dateLocal.split("-").map(Number);
  const [hh, mm] = hhmm.split(":").map(Number);
  const guess = Date.UTC(y, mo - 1, d, hh, mm, 0);
  const off1 = tzOffsetMs(new Date(guess), tz);
  let utc = guess - off1;
  const off2 = tzOffsetMs(new Date(utc), tz);
  if (off2 !== off1) utc = guess - off2;
  return new Date(utc);
};

// "YYYY-MM-DD" for an instant in the given timezone.
export const localDateString = (instant: Date, tz: string): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);

const ymdInUtc = (ms: number): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));

export const addDaysLocal = (dateLocal: string, n: number): string => {
  const [y, mo, d] = dateLocal.split("-").map(Number);
  return ymdInUtc(Date.UTC(y, mo - 1, d) + n * 86400000);
};

// Weekday key of a calendar date (timezone-independent for a Y-M-D).
const weekdayKeyOf = (dateLocal: string): (typeof WEEKDAY_KEYS)[number] => {
  const [y, mo, d] = dateLocal.split("-").map(Number);
  const dow = new Date(Date.UTC(y, mo - 1, d)).getUTCDay(); // 0=Sun..6=Sat
  const map = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
  return map[dow];
};

const slotLabel = (instant: Date, tz: string): string =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(instant);

const normalizeExisting = (existing: ExistingAppt[], slotMinutes: number) =>
  existing.map(e => {
    const start = new Date(e.startUtc).getTime();
    return { start, end: start + (e.durationMin ?? slotMinutes) * 60000 };
  });

// True if [start, start+durationMin) overlaps any existing appt (half-open).
// Reused by the POST overlap guard.
export const overlapsExisting = (
  startUtc: Date,
  durationMin: number,
  existing: ExistingAppt[],
): boolean => {
  const s = startUtc.getTime();
  const e = s + durationMin * 60000;
  return normalizeExisting(existing, durationMin).some(
    x => s < x.end && x.start < e,
  );
};

// Compute all slots for a clinic-local date. Returns [] when booking is
// disabled, the date is a blackout, the weekday is closed, or the date is
// outside [today, today+advanceDays] in the clinic timezone.
export const computeSlots = (
  config: BookingConfig,
  dateLocal: string,
  existing: ExistingAppt[],
  now: Date = new Date(),
): ComputedSlot[] => {
  if (!config.enabled) return [];

  const todayLocal = localDateString(now, config.timezone);
  const maxLocal = addDaysLocal(todayLocal, config.advanceDays);
  if (dateLocal < todayLocal || dateLocal > maxLocal) return [];
  if (config.blackoutDates.includes(dateLocal)) return [];

  const ranges = config.hours[weekdayKeyOf(dateLocal)] ?? [];
  if (ranges.length === 0) return [];

  const slotMs = config.slotMinutes * 60000;
  const earliestMs = now.getTime() + config.leadTimeMinutes * 60000;
  const norm = normalizeExisting(existing, config.slotMinutes);

  const slots: ComputedSlot[] = [];
  for (const range of ranges) {
    let cursor = zonedWallTimeToUtc(
      dateLocal,
      range.open,
      config.timezone,
    ).getTime();
    const close = zonedWallTimeToUtc(
      dateLocal,
      range.close,
      config.timezone,
    ).getTime();

    // Slot must fit fully inside the range.
    while (cursor + slotMs <= close) {
      const end = cursor + slotMs;
      let available = true;
      let reason: ComputedSlot["reason"];
      if (cursor < earliestMs) {
        available = false;
        reason = "past";
      } else if (norm.some(x => cursor < x.end && x.start < end)) {
        available = false;
        reason = "booked";
      }
      slots.push({
        startUtc: new Date(cursor).toISOString(),
        endUtc: new Date(end).toISOString(),
        localLabel: slotLabel(new Date(cursor), config.timezone),
        available,
        reason,
      });
      cursor = end;
    }
  }
  return slots;
};
