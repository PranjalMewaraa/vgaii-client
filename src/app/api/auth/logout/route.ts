import { getUser } from "@/middleware/auth";
import { logAudit } from "@/lib/audit";
import { NextResponse } from "next/server";

// Logout is a client-side action (clear localStorage) — JWTs aren't
// invalidatable without server-side state we don't keep. This endpoint
// just records the audit entry so admins can see the session ended.
// If the request is unauthenticated, return success silently rather than
// 401 since the client is logging out anyway.
export async function POST(req: Request) {
  try {
    const user = getUser(req);
    await logAudit(req, { actorType: "user", user }, {
      action: "auth.logout",
      entityType: "User",
      entityId: user.id ?? null,
      summary: "Logged out",
    });
  } catch {
    // No-op: token already invalid / missing — client clears state anyway.
  }
  return NextResponse.json({ ok: true });
}
