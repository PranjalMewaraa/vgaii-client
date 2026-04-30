import type { AuthUser, UserRole } from "@/lib/auth";

export const checkRole = (user: AuthUser, allowedRoles: UserRole[]) => {
  if (!allowedRoles.includes(user.role)) {
    throw new Error("Forbidden");
  }
};

export const checkModule = (user: AuthUser, module: string) => {
  if (user.role === "SUPER_ADMIN") return;

  if (!user.assignedModules?.includes(module)) {
    throw new Error("Module access denied");
  }
};
