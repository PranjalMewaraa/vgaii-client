import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { getUser } from "@/middleware/auth";
import { profileSchema } from "@/lib/validators/profile";
import { getErrorMessage } from "@/lib/errors";
import { logAudit } from "@/lib/audit";
import { NextResponse } from "next/server";

const requireAdmin = (user: ReturnType<typeof getUser>) => {
  if (user.role !== "CLIENT_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!user.clientId) {
    return NextResponse.json({ error: "No client context" }, { status: 400 });
  }
  return null;
};

export async function GET(req: Request) {
  try {
    const user = getUser(req);
    const block = requireAdmin(user);
    if (block) return block;

    const client = await prisma.client.findUnique({
      where: { id: user.clientId! },
      select: { profile: true },
    });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json({ profile: client.profile ?? null });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = getUser(req);
    const block = requireAdmin(user);
    if (block) return block;

    const body = await req.json();
    const parsed = profileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const client = await prisma.client.update({
      where: { id: user.clientId! },
      data: { profile: parsed.data as Prisma.InputJsonValue },
      select: { id: true, profile: true },
    });

    await logAudit(req, { actorType: "user", user }, {
      action: "client.profile.updated",
      entityType: "Client",
      entityId: client.id,
      summary: "Public profile updated",
    });

    return NextResponse.json({ profile: client.profile });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
