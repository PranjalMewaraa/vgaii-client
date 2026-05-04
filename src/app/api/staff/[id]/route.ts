import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getUser } from "@/middleware/auth";
import { staffUpdateSchema } from "@/lib/validators/staff";
import { getErrorMessage } from "@/lib/errors";
import { logAudit } from "@/lib/audit";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

const requireAdmin = (user: ReturnType<typeof getUser>) => {
  if (user.role !== "CLIENT_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!user.clientId) {
    return NextResponse.json({ error: "No client context" }, { status: 400 });
  }
  return null;
};

export async function PATCH(req: Request, ctx: RouteContext) {
  try {
    const user = getUser(req);
    const block = requireAdmin(user);
    if (block) return block;

    const { id } = await ctx.params;

    const body = await req.json();
    const parsed = staffUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    // findFirst (not findUnique): the where clause includes scope filters
    // (clientId, role) on top of the unique id, so we want a multi-key
    // lookup that returns null when scope mismatches instead of bypassing
    // it.
    const target = await prisma.user.findFirst({
      where: { id, clientId: user.clientId, role: "STAFF" },
    });
    if (!target) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    const changedFields: string[] = [];
    const data: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) {
      data.name = parsed.data.name;
      changedFields.push("name");
    }
    if (parsed.data.assignedModules !== undefined) {
      data.assignedModules = parsed.data.assignedModules;
      changedFields.push("modules");
    }
    if (parsed.data.password !== undefined) {
      data.password = await bcrypt.hash(parsed.data.password, 10);
      changedFields.push("password");
    }

    const updated = await prisma.user.update({
      where: { id: target.id },
      data,
    });

    await logAudit(req, { actorType: "user", user }, {
      action: "staff.updated",
      entityType: "User",
      entityId: updated.id,
      entityLabel: updated.name ?? updated.email ?? "Staff",
      summary: `Updated: ${changedFields.join(", ") || "no fields"}`,
      metadata: { fields: changedFields },
    });

    return NextResponse.json({
      staff: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        assignedModules: (updated.assignedModules as string[] | null) ?? [],
        createdAt: updated.createdAt,
        createdBy: updated.createdById,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function DELETE(req: Request, ctx: RouteContext) {
  try {
    const user = getUser(req);
    const block = requireAdmin(user);
    if (block) return block;

    const { id } = await ctx.params;

    const target = await prisma.user.findFirst({
      where: { id, clientId: user.clientId, role: "STAFF" },
    });
    if (!target) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    await prisma.user.delete({ where: { id: target.id } });

    await logAudit(req, { actorType: "user", user }, {
      action: "staff.deleted",
      entityType: "User",
      entityId: target.id,
      entityLabel: target.name ?? target.email ?? "Staff",
      summary: "Staff account removed",
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
