import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { getUser } from "@/middleware/auth";
import { generateToken } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

// Sliding session: client polls this every ~30 min (and on tab focus). We
// re-issue a fresh JWT off the back of a valid one. Active users never
// see the 1-day expiry; idle tokens expire normally.
//
// We reload the user's role/clientId/assignedModules from the DB instead of
// trusting the incoming token alone, so revoked permissions take effect on
// the next renewal rather than waiting for full token expiry.
export async function POST(req: Request) {
  try {
    await connectDB();
    const user = getUser(req);

    if (!user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const fresh = await User.findById(user.id)
      .select("role clientId assignedModules")
      .lean<{
        role?: "SUPER_ADMIN" | "CLIENT_ADMIN" | "STAFF";
        clientId?: { toString(): string } | null;
        assignedModules?: string[];
      } | null>();

    if (!fresh || !fresh.role) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const token = generateToken({
      id: user.id,
      role: fresh.role,
      clientId: fresh.clientId?.toString() ?? null,
      assignedModules: fresh.assignedModules ?? [],
      impersonatedBy: user.impersonatedBy,
    });

    return NextResponse.json({ token });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 401 });
  }
}
