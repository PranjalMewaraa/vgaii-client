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
});

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
