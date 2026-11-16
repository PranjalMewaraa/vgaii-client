import { z } from "zod";

// Per-client self-hosted booking configuration. Stored as a JSON blob on
// Client.bookingConfig. All times/dates are clinic-local (interpreted in
// `timezone`); appointment instants are stored UTC as usual.

export const WEEKDAY_KEYS = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
] as const;
export type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ALLOWED_SLOT_MINUTES = [5, 10, 15, 20, 30, 60] as const;

const isValidTimezone = (tz: string): boolean => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

// One open→close window in clinic-local HH:mm. Multiple per day model lunch
// breaks. String comparison is valid for zero-padded 24h times.
const rangeSchema = z
  .object({
    open: z.string().regex(HHMM_RE, "Use HH:mm (24h)"),
    close: z.string().regex(HHMM_RE, "Use HH:mm (24h)"),
  })
  .refine(r => r.close > r.open, {
    message: "Close time must be after open time",
  });

const daySchema = z.array(rangeSchema).max(6).default([]);

const hoursSchema = z.object({
  mon: daySchema,
  tue: daySchema,
  wed: daySchema,
  thu: daySchema,
  fri: daySchema,
  sat: daySchema,
  sun: daySchema,
});

export const bookingConfigSchema = z.object({
  enabled: z.boolean().default(false),
  timezone: z
    .string()
    .trim()
    .refine(isValidTimezone, { message: "Unknown timezone" })
    .default("Asia/Kolkata"),
  slotMinutes: z
    .number()
    .int()
    .refine(n => (ALLOWED_SLOT_MINUTES as readonly number[]).includes(n), {
      message: "Slot length must be 5, 10, 15, 20, 30, or 60 minutes",
    })
    .default(15),
  leadTimeMinutes: z.number().int().min(0).max(10080).default(60),
  advanceDays: z.number().int().min(1).max(365).default(30),
  hours: hoursSchema,
  blackoutDates: z
    .array(z.string().regex(DATE_RE, "Use YYYY-MM-DD"))
    .max(366)
    .default([]),
});

export type BookingConfig = z.infer<typeof bookingConfigSchema>;
export type BookingRange = z.infer<typeof rangeSchema>;

// Fallback used when Client.bookingConfig is null or invalid. Disabled by
// default, so existing clients keep their current manual-entry behavior.
export const DEFAULT_BOOKING_CONFIG: BookingConfig = {
  enabled: false,
  timezone: "Asia/Kolkata",
  slotMinutes: 15,
  leadTimeMinutes: 60,
  advanceDays: 30,
  hours: {
    mon: [
      { open: "10:00", close: "13:00" },
      { open: "17:00", close: "20:00" },
    ],
    tue: [
      { open: "10:00", close: "13:00" },
      { open: "17:00", close: "20:00" },
    ],
    wed: [
      { open: "10:00", close: "13:00" },
      { open: "17:00", close: "20:00" },
    ],
    thu: [
      { open: "10:00", close: "13:00" },
      { open: "17:00", close: "20:00" },
    ],
    fri: [
      { open: "10:00", close: "13:00" },
      { open: "17:00", close: "20:00" },
    ],
    sat: [{ open: "10:00", close: "13:00" }],
    sun: [],
  },
  blackoutDates: [],
};
