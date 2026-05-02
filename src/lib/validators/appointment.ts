import { z } from "zod";
import { APPOINTMENT_STATUSES } from "@/models/Appointment";

const optionalDate = z
  .string()
  .refine(s => !Number.isNaN(Date.parse(s)), "Invalid date")
  .optional();

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
    leadId: z
      .string()
      .regex(/^[a-fA-F0-9]{24}$/)
      .nullable()
      .optional(),
  })
  .refine(d => Object.values(d).some(v => v !== undefined), {
    message: "At least one field is required",
  });
