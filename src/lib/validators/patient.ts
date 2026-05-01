import { z } from "zod";

const emptyToUndefined = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform(v => (v && v.length > 0 ? v : undefined));

export const patientCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(10).max(40),
  age: z.number().int().min(0).max(150),
  gender: z.string().trim().min(1).max(40),
  email: z
    .union([z.literal(""), z.string().email().max(120), z.undefined()])
    .transform(v => (v && v.length > 0 ? v : undefined)),
  area: emptyToUndefined(120),
  source: emptyToUndefined(120),
  notes: emptyToUndefined(2000),
});

export type PatientCreateInput = z.infer<typeof patientCreateSchema>;
