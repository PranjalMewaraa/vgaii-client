import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/auth";
import { getUser } from "@/middleware/auth";
import { getErrorMessage } from "@/lib/errors";
import { logAudit } from "@/lib/audit";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const user = getUser(req);

    if (user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { userId, clientId } = body as {
      userId?: string;
      clientId?: string;
    };

    let target = null;

    if (userId) {
      target = await prisma.user.findUnique({ where: { id: userId } });
    } else if (clientId) {
      // Backwards-compat: impersonate the CLIENT_ADMIN of a given client.
      target = await prisma.user.findFirst({
        where: { clientId, role: "CLIENT_ADMIN" },
      });
    }

    if (!target) {
      return NextResponse.json(
        { error: "Target user not found" },
        { status: 404 },
      );
    }

    if (target.role === "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Cannot impersonate another super admin" },
        { status: 400 },
      );
    }

    const client = target.clientId
      ? await prisma.client.findUnique({
          where: { id: target.clientId },
          select: { name: true },
        })
      : null;

    const modules = (target.assignedModules as string[] | null) ?? [];

    const token = generateToken({
      id: target.id,
      role: target.role,
      clientId: target.clientId ?? null,
      assignedModules: modules,
      impersonatedBy: user.id ?? "SUPER_ADMIN",
    });

    await logAudit(
      req,
      { actorType: "user", user, clientId: target.clientId ?? null },
      {
        action: "user.impersonated",
        entityType: "User",
        entityId: target.id,
        entityLabel: target.name ?? target.email ?? "User",
        summary: `Super admin impersonated ${target.email ?? target.id}`,
        metadata: { targetRole: target.role, clientName: client?.name ?? null },
      },
    );

    return NextResponse.json({
      token,
      user: {
        id: target.id,
        name: target.name,
        email: target.email,
        role: target.role,
        clientId: target.clientId ?? null,
        clientName: client?.name ?? null,
        assignedModules: modules,
        impersonatedBy: user.id ?? "SUPER_ADMIN",
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
