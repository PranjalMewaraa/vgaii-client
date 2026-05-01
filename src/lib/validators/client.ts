import { z } from "zod";

// `null` clears a field; omitting it leaves the existing value untouched.
// We don't enforce URL shape here — the settings page validates HTML-side and
// the admin controls the value, so this stays permissive.
export const clientSettingsSchema = z
  .object({
    googlePlaceId: z.string().trim().max(500).nullable().optional(),
    calendlySchedulingUrl: z.string().trim().max(500).nullable().optional(),
  })
  .refine(
    d =>
      d.googlePlaceId !== undefined ||
      d.calendlySchedulingUrl !== undefined,
    { message: "At least one field is required" },
  );
