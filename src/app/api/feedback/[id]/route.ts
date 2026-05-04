import { prisma } from "@/lib/prisma";
import { getUser } from "@/middleware/auth";
import { getErrorMessage } from "@/lib/errors";
import { logAudit } from "@/lib/audit";
import { NextResponse } from "next/server";

type FeedbackRouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: Request, context: FeedbackRouteContext) {
  try {
    const user = getUser(req);
    const { id } = await context.params;

    // Tenant-scoped find before update — the where clause includes both id
    // and clientId, so findFirst keeps the scoping safe (vs findUnique
    // which would only key on id).
    const existing = await prisma.feedback.findFirst({
      where: {
        id,
        ...(user.clientId ? { clientId: user.clientId } : {}),
      },
    });
    if (!existing) {
      return NextResponse.json({ feedback: null });
    }

    const feedback = await prisma.feedback.update({
      where: { id: existing.id },
      data: { status: "resolved" },
    });

    await logAudit(req, { actorType: "user", user }, {
      action: "feedback.resolved",
      entityType: "Feedback",
      entityId: feedback.id,
      entityLabel: feedback.clientName ?? "Anonymous",
      summary: "Feedback marked resolved",
    });

    return NextResponse.json({ feedback });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
