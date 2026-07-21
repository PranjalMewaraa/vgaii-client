import { z } from "zod";
import { prescriptionItemSchema } from "@/lib/validators/prescription";

const optionalNullableNumber = z.number().finite().nullable().optional();
const optionalNullableInt = z.number().int().nullable().optional();

// Record a walk-in: identify (or create) a patient by name + phone, then log a
// completed visit in one call. `linkLeadId`, when present, attaches the visit
// to that existing patient instead of creating a new one.
export const walkInSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(10).max(40),
  age: z.number().int().min(0).max(150).nullable().optional(),
  gender: z.string().trim().max(40).optional(),
  linkLeadId: z.string().min(1).max(60).optional(),

  // Clinical record (mirrors prescriptionCreateSchema, minus leadId).
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

export type WalkInInput = z.infer<typeof walkInSchema>;
