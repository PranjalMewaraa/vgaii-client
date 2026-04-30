import type { AuthUser } from "@/lib/auth";

type QueryFilter = Record<string, unknown>;

export const withClientFilter = (
  user: AuthUser,
  query: QueryFilter = {},
): QueryFilter => {
  if (user.role === "SUPER_ADMIN") return query;

  return {
    ...query,
    clientId: user.clientId,
  };
};
