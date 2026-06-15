import { z } from "zod";
import { APPOINTMENT_STATUSES } from "@/lib/constants";

const optionalDate = z
  .string()
  .refine(s => !Number.isNaN(Date.parse(s)), "Invalid date")
  .optional();

export const appointmentCreateSchema = z.object({
  name: z.string().min(1).max(120),
  phone: z.string().min(10).max(40),
  email: z.string().email().max(120).optional().or(z.literal("")),
  date: z.string().refine(s => !Number.isNaN(Date.parse(s)), "Invalid date"),
  age: z.number().int().min(0).max(150).optional(),
  gender: z.string().max(40).optional(),
  notes: z.string().max(5000).optional(),
  leadId: z.string().min(1).max(60).optional(),
  // Slot length (minutes) when booked via the self-hosted SlotPicker. Its
  // presence opts the appointment into double-booking prevention.
  durationMin: z.number().int().min(5).max(480).optional(),
});

// Vitals fields accept null so the UI can explicitly clear a previously
// recorded value (sending an empty string would otherwise be ignored).
const optionalNullableNumber = z.number().finite().nullable().optional();
const optionalNullableInt = z.number().int().nullable().optional();

export const appointmentUpdateSchema = z
  .object({
    status: z.enum(APPOINTMENT_STATUSES).optional(),
    notes: z.string().max(5000).optional(),
    date: optionalDate,
    diagnosis: z.string().max(5000).optional(),
    medicines: z.array(z.string().max(200)).max(50).optional(),
    name: z.string().max(120).optional(),
    phone: z.string().max(40).optional(),
    email: z.string().max(120).optional(),
    age: z.number().int().min(0).max(150).optional(),
    gender: z.string().max(40).optional(),
    // Optional vitals captured at completion. Loose ranges so we don't
    // reject legitimate edge cases (e.g. paediatric patients on the low
    // side of weight).
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
    // Was an ObjectId-hex regex; cuid is 25 chars of [a-z0-9]. Loosen to a
    // permissive ID shape so we don't reject valid Prisma cuids.
    leadId: z
      .string()
      .min(1)
      .max(60)
      .nullable()
      .optional(),
  })
  .refine(d => Object.values(d).some(v => v !== undefined), {
    message: "At least one field is required",
  });
