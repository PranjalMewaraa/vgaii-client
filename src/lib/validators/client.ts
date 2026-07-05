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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Loose phone check: 7–20 chars of digits and common separators.
const MOBILE_RE = /^[+\d][\d\s().-]{6,19}$/;

const optionalEmail = z
  .string()
  .trim()
  .refine(s => s === "" || EMAIL_RE.test(s), {
    message: "Enter a valid email address.",
  });

const optionalMobile = z
  .string()
  .trim()
  .refine(s => s === "" || MOBILE_RE.test(s), {
    message: "Enter a valid phone number.",
  });

// CLIENT_ADMIN-facing settings: business contact details (name, email,
// mobile). Slug + custom domain are platform-managed on the super-admin
// clients page. `null` clears a field; omitting it leaves it untouched.
export const clientSettingsSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    email: optionalEmail.nullable().optional(),
    mobile: optionalMobile.nullable().optional(),
  })
  .refine(
    d =>
      d.name !== undefined ||
      d.email !== undefined ||
      d.mobile !== undefined,
    { message: "At least one field is required" },
  );

export const adminClientUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    plan: z.enum(["basic", "pro"]).optional(),
    subscriptionStatus: z.enum(["active", "trial", "expired"]).optional(),
    renewalDate: z
      .string()
      .nullable()
      .refine(s => s === null || !Number.isNaN(Date.parse(s)), "Invalid date")
      .optional(),
    googlePlaceId: z.string().trim().max(500).nullable().optional(),
    subscriptionKey: z.string().trim().max(500).nullable().optional(),
    profileSlug: optionalSlug.nullable().optional(),
    customDomain: optionalHostname.nullable().optional(),
  })
  .refine(d => Object.keys(d).length > 0, {
    message: "At least one field is required",
  });
