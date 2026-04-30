import { generateToken } from "@/lib/auth";
import { getUser } from "@/middleware/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const user = getUser(req);

  if (user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { clientId } = await req.json();

  if (!clientId) {
    return NextResponse.json({ error: "clientId required" }, { status: 400 });
  }

  const token = generateToken({
    id: user.id,
    role: "CLIENT_ADMIN",
    clientId,
    impersonatedBy: user.id ?? "SUPER_ADMIN",
  });

  return NextResponse.json({ token });
}
