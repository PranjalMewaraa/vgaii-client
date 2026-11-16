import { z } from "zod";

// A single structured line on a prescription. Only `name` is required — the
// doctor can leave dosing details blank for simple/OTC entries. Kept as short
// strings (not enums) so the UI selects can offer presets while still allowing
// free text a clinician types in.
export const prescriptionItemSchema = z.object({
  name: z.string().trim().min(1).max(200),
  dosage: z.string().trim().max(60).optional(),
  frequency: z.string().trim().max(20).optional(),
  timing: z.string().trim().max(80).optional(),
  duration: z.string().trim().max(40).optional(),
  instructions: z.string().trim().max(160).optional(),
});

export type PrescriptionItem = z.infer<typeof prescriptionItemSchema>;

const optionalNullableNumber = z.number().finite().nullable().optional();
const optionalNullableInt = z.number().int().nullable().optional();

// Creating a prescription = recording a new completed visit (encounter) for a
// patient. Handled by POST /api/prescriptions, which materialises an
// Appointment row dated today.
export const prescriptionCreateSchema = z.object({
  leadId: z.string().min(1).max(60),
  date: z
    .string()
    .refine(s => !Number.isNaN(Date.parse(s)), "Invalid date")
    .optional(),
  encounterType: z.string().trim().max(80).optional(),
  diagnosis: z.string().trim().max(5000).optional(),
  diagnosisCode: z.string().trim().max(40).optional(),
  diagnosisStatus: z.string().trim().max(40).optional(),
  observations: z.string().trim().max(5000).optional(),
  medicines: z.array(prescriptionItemSchema).max(50).optional(),
  weightKg: optionalNullableNumber.refine(
    v => v === undefined || v === null || (v >= 0 && v <= 500),
    "Weight must be between 0 and 500 kg",
  ),
  sugarMgDl: optionalNullableNumber.refine(
    v => v === undefined || v === null || (v >= 0 && v <= 1000),
    "Sugar level must be between 0 and 1000 mg/dL",
  ),
  bpSystolic: optionalNullableInt.refine(
    v => v === undefined || v === null || (v >= 0 && v <= 300),
    "BP systolic must be between 0 and 300",
  ),
  bpDiastolic: optionalNullableInt.refine(
    v => v === undefined || v === null || (v >= 0 && v <= 200),
    "BP diastolic must be between 0 and 200",
  ),
});

export type PrescriptionCreateInput = z.infer<typeof prescriptionCreateSchema>;
