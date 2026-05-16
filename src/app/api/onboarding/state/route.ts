import { prisma } from "@/lib/prisma";
import { getUser } from "@/middleware/auth";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

// Returns the caller's onboarding state so AppShell can decide between
// showing the welcome modal, the resume banner, or nothing. Cheap and
// open to any logged-in user — non-CLIENT_ADMIN roles just always come
// back with `eligible: false` so the client doesn't need a role check.
export async function GET(req: Request) {
  try {
    const user = getUser(req);

    // Need fresh state from the DB — the JWT only carries id/role, not
    // the tour columns. Two narrow lookups (user + tenant) so we don't
    // pull every column.
    const dbUser = user.id
      ? await prisma.user.findUnique({
          where: { id: user.id },
          select: {
            onboardingState: true,
            onboardingStartedAt: true,
            onboardingDoneAt: true,
          },
        })
      : null;
    const client = user.clientId
      ? await prisma.client.findUnique({
          where: { id: user.clientId },
          select: { demoDataSeededAt: true },
        })
      : null;

    const state = dbUser?.onboardingState ?? "done";
    const eligible = user.role === "CLIENT_ADMIN" && state !== "done";
    const demoSeeded = !!client?.demoDataSeededAt;
    const resumable =
      user.role === "CLIENT_ADMIN" && state === "in_progress";

    return NextResponse.json({
      state,
      role: user.role,
      eligible,
      demoSeeded,
      resumable,
      startedAt: dbUser?.onboardingStartedAt ?? null,
      doneAt: dbUser?.onboardingDoneAt ?? null,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
