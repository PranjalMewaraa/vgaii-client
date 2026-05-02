import { z } from "zod";
import { passwordPolicy } from "@/lib/password-policy";

export const createClientSchema = z.object({
  name: z.string().trim().min(2).max(120),
  plan: z.enum(["basic", "pro"]).optional(),
  subscriptionStatus: z.enum(["active", "trial", "expired"]).optional(),
  renewalDate: z
    .string()
    .refine(s => !Number.isNaN(Date.parse(s)), "Invalid date")
    .optional(),
  // Integrations are platform-managed and set at creation time. They can be
  // edited later via PATCH /api/admin/clients/[id]; CLIENT_ADMIN never gets
  // write access.
  googlePlaceId: z.string().trim().max(500).optional(),
  bookingUrl: z.string().trim().max(500).optional(),
  admin: z.object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().email().toLowerCase(),
    password: passwordPolicy,
  }),
});

export type CreateClientPayload = z.infer<typeof createClientSchema>;
