import { verifyToken, type AuthUser } from "@/lib/auth";

export const getUserFromRequest = (req: Request): AuthUser => {
  const token = req.headers.get("authorization")?.split(" ")[1];

  if (!token) throw new Error("No token");

  return verifyToken(token);
};

export const getUser = (req: Request): AuthUser => {
  const token = req.headers.get("authorization")?.split(" ")[1];

  if (!token) throw new Error("Unauthorized");

  return verifyToken(token);
};
