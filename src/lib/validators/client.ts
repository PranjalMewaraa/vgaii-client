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

// CLIENT_ADMIN-facing settings: branding only (slug + custom domain).
// Integrations (googlePlaceId, bookingUrl) and security (webhookKey) are
// platform-managed and live on the super-admin clients page.
// `null` clears a field; omitting it leaves the existing value untouched.
export const clientSettingsSchema = z
  .object({
    profileSlug: optionalSlug.nullable().optional(),
    customDomain: optionalHostname.nullable().optional(),
  })
  .refine(
    d => d.profileSlug !== undefined || d.customDomain !== undefined,
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
    bookingUrl: z.string().trim().max(500).nullable().optional(),
    profileSlug: optionalSlug.nullable().optional(),
    customDomain: optionalHostname.nullable().optional(),
  })
  .refine(d => Object.keys(d).length > 0, {
    message: "At least one field is required",
  });
