import { z } from "zod";
import { APPOINTMENT_STATUSES } from "@/models/Appointment";

export const appointmentUpdateSchema = z
  .object({
    status: z.enum(APPOINTMENT_STATUSES).optional(),
    notes: z.string().max(5000).optional(),
    date: z
      .string()
      .refine(s => !Number.isNaN(Date.parse(s)), "Invalid date")
      .optional(),
  })
  .refine(
    d =>
      d.status !== undefined || d.notes !== undefined || d.date !== undefined,
    { message: "At least one field is required" },
  );
