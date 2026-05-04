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

export const leadUpdateSchema = z
  .object({
    status: z.enum(LEAD_STATUSES).optional(),
    notes: z.string().max(5000).optional(),
    outcomeRating: z.number().int().min(1).max(5).optional(),
  })
  .refine(
    d =>
      d.status !== undefined ||
      d.notes !== undefined ||
      d.outcomeRating !== undefined,
    { message: "At least one field is required" },
  );

