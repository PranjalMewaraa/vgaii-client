import type { AuthUser, UserRole } from "@/lib/auth";

export const ASSIGNABLE_MODULES = [
  "leads",
  "patients",
  "appointments",
  "feedback",
  "payments",
] as const;

export type AssignableModule = (typeof ASSIGNABLE_MODULES)[number];

export const checkRole = (user: AuthUser, allowedRoles: UserRole[]) => {
  if (!allowedRoles.includes(user.role)) {
    throw new Error("Forbidden");
  }
};

export const checkModule = (user: AuthUser, module: string) => {
  if (user.role === "SUPER_ADMIN") return;
  if (user.role === "CLIENT_ADMIN") return;

  if (!user.assignedModules?.includes(module)) {
    throw new Error("Module access denied");
  }
};

// Passes if the user has ANY of the given modules. Used where a resource is
// reachable from more than one context — e.g. appointment attachments are
// viewable from both the appointments list and a patient's history, so staff
// scoped to either module should be able to read them.
export const checkAnyModule = (user: AuthUser, modules: string[]) => {
  if (user.role === "SUPER_ADMIN") return;
  if (user.role === "CLIENT_ADMIN") return;

  const allowed = modules.some(m => user.assignedModules?.includes(m));
  if (!allowed) {
    throw new Error("Module access denied");
  }
};
