import { z } from "zod";
import { ASSIGNABLE_MODULES } from "@/lib/rbac";

const moduleEnum = z.enum(ASSIGNABLE_MODULES);

export const staffCreateSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(120),
  assignedModules: z.array(moduleEnum).default([]),
});

export const staffUpdateSchema = z
  .object({
    name: z.string().min(2).max(80).optional(),
    password: z.string().min(8).max(120).optional(),
    assignedModules: z.array(moduleEnum).optional(),
  })
  .refine(
    data =>
      data.name !== undefined ||
      data.password !== undefined ||
      data.assignedModules !== undefined,
    { message: "At least one field is required" },
  );
