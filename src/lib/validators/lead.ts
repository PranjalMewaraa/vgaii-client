import { z } from "zod";
import { LEAD_STATUSES } from "@/lib/constants";

export const leadSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  area: z.string().optional(),
  source: z.string().optional(),
});

export const leadStatusSchema = z.object({
  phone: z.string().min(10),
  status: z.enum(LEAD_STATUSES),
  note: z.string().optional(),
  outcomeRating: z.number().min(1).max(5).optional(),
});

export const publicLeadSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  source: z.string().optional(),
});

// Edits made from the patient detail page go through this schema.
// `phone` is intentionally absent — it's the unique linking key (Lead ↔
// Appointment ↔ Payment all match on phoneNormalized), so changing it
// would silently break the patient's history. New numbers should be
// captured as a fresh lead instead.
export const leadUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    email: z.string().trim().max(200).optional().or(z.literal("")),
    age: z.number().int().min(0).max(150).nullable().optional(),
    gender: z.string().trim().max(20).optional().or(z.literal("")),
    area: z.string().trim().max(200).optional().or(z.literal("")),
    status: z.enum(LEAD_STATUSES).optional(),
    notes: z.string().max(5000).optional(),
    outcomeRating: z.number().int().min(1).max(5).optional(),
  })
  .refine(d => Object.keys(d).length > 0, {
    message: "At least one field is required",
  });

