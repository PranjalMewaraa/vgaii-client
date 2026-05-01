import { z } from "zod";

const slugRegex = /^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$/;
// Hostnames: very loose — must contain a dot, no spaces, no protocol.
const hostnameRegex = /^[a-z0-9.-]+\.[a-z]{2,}$/;

const optionalSlug = z
  .string()
  .trim()
  .toLowerCase()
  .refine(s => s === "" || slugRegex.test(s), {
    message:
      "Slug must be lowercase letters, digits, or hyphens (2–60 chars).",
  });

const optionalHostname = z
  .string()
  .trim()
  .toLowerCase()
  .refine(s => s === "" || hostnameRegex.test(s), {
    message: "Enter a hostname like example.com (no http://, no path).",
  });

// `null` clears a field; omitting it leaves the existing value untouched.
export const clientSettingsSchema = z
  .object({
    googlePlaceId: z.string().trim().max(500).nullable().optional(),
    calendlySchedulingUrl: z.string().trim().max(500).nullable().optional(),
    profileSlug: optionalSlug.nullable().optional(),
    customDomain: optionalHostname.nullable().optional(),
  })
  .refine(
    d =>
      d.googlePlaceId !== undefined ||
      d.calendlySchedulingUrl !== undefined ||
      d.profileSlug !== undefined ||
      d.customDomain !== undefined,
    { message: "At least one field is required" },
  );
