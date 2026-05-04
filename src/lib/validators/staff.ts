import { z } from "zod";
import { ASSIGNABLE_MODULES } from "@/lib/rbac";
import { passwordPolicy } from "@/lib/password-policy";

const moduleEnum = z.enum(ASSIGNABLE_MODULES);

export const staffCreateSchema = z.object({
  name: z.string().min(2).max(80),
  // `.toLowerCase()` + `.trim()` so `Foo@bar.com` and ` foo@bar.com `
  // can't accidentally create separate users from the same address.
  email: z.string().trim().email().toLowerCase(),
  password: passwordPolicy,
  assignedModules: z.array(moduleEnum).default([]),
});

export const staffUpdateSchema = z
  .object({
    name: z.string().min(2).max(80).optional(),
    password: passwordPolicy.optional(),
    assignedModules: z.array(moduleEnum).optional(),
  })
  .refine(
    data =>
      data.name !== undefined ||
      data.password !== undefined ||
      data.assignedModules !== undefined,
    { message: "At least one field is required" },
  );
