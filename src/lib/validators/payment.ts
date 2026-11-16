import { z } from "zod";
import { PAYMENT_METHODS, EXPENSE_CATEGORIES } from "@/lib/constants";

// Money values cross the wire as integer paise. Anything negative or
// non-integer would corrupt the daily totals so reject early.
const paiseField = z.number().int().min(0).max(1_00_00_000);

const itemSchema = z.object({
  presetChargeId: z.string().min(1).max(60).optional(),
  title: z.string().min(1).max(120),
  amount: paiseField,
});

export const paymentCreateSchema = z
  .object({
    leadId: z.string().min(1).max(60).optional(),
    appointmentId: z.string().min(1).max(60).optional(),
    patientName: z.string().max(120).optional(),
    patientPhone: z.string().max(40).optional(),
    items: z.array(itemSchema).min(1, "At least one charge is required"),
    discount: paiseField.optional(),
    paymentMethod: z.enum(PAYMENT_METHODS),
    notes: z.string().max(2000).optional(),
  })
  .refine(
    d => d.leadId || (d.patientName?.trim() ?? "").length >= 1,
    {
      message: "Either link a patient or enter a walk-in name",
      path: ["patientName"],
    },
  );

export const presetChargeCreateSchema = z.object({
  title: z.string().min(1).max(120),
  amount: paiseField,
  active: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});

export const presetChargeUpdateSchema = z
  .object({
    title: z.string().min(1).max(120).optional(),
    amount: paiseField.optional(),
    active: z.boolean().optional(),
    sortOrder: z.number().int().min(0).max(9999).optional(),
  })
  .refine(d => Object.values(d).some(v => v !== undefined), {
    message: "At least one field is required",
  });

export const expenseCreateSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES),
  amount: paiseField,
  paymentMethod: z.enum(PAYMENT_METHODS),
  notes: z.string().max(2000).optional(),
});

export const expensePresetCreateSchema = z.object({
  title: z.string().min(1).max(120),
  category: z.enum(EXPENSE_CATEGORIES),
  amount: paiseField,
  active: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});

export const expensePresetUpdateSchema = z
  .object({
    title: z.string().min(1).max(120).optional(),
    category: z.enum(EXPENSE_CATEGORIES).optional(),
    amount: paiseField.optional(),
    active: z.boolean().optional(),
    sortOrder: z.number().int().min(0).max(9999).optional(),
  })
  .refine(d => Object.values(d).some(v => v !== undefined), {
    message: "At least one field is required",
  });
