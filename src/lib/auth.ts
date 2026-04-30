import jwt, { type JwtPayload } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export type UserRole = "SUPER_ADMIN" | "CLIENT_ADMIN" | "STAFF";

export type AuthUser = {
  id?: string;
  role: UserRole;
  clientId?: string | null;
  assignedModules?: string[];
  impersonatedBy?: string;
};

export const generateToken = (payload: AuthUser) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1d" });
};

export const verifyToken = (token: string) => {
  const decoded = jwt.verify(token, JWT_SECRET);

  if (typeof decoded === "string") {
    throw new Error("Invalid token");
  }

  const payload = decoded as JwtPayload & AuthUser;

  if (!payload.role) {
    throw new Error("Invalid token");
  }

  return {
    id: payload.id,
    role: payload.role,
    clientId: payload.clientId ?? null,
    assignedModules: payload.assignedModules ?? [],
    impersonatedBy: payload.impersonatedBy,
  };
};
