import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getUser } from "@/middleware/auth";
import { passwordPolicy } from "@/lib/password-policy";
import { getErrorMessage } from "@/lib/errors";
import { logAudit } from "@/lib/audit";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ password: passwordPolicy });

type RouteContext = { params: Promise<{ id: string }> };

// Super-admin password reset: set a new password for any user. No current
// password required (this is the admin override path).
export async function POST(req: Request, ctx: RouteContext) {
  try {
    const user = getUser(req);
    if (user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await ctx.params;
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, clientId: true },
    });
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await prisma.user.update({
      where: { id: target.id },
      data: { password: await bcrypt.hash(parsed.data.password, 10) },
    });

    await logAudit(
      req,
      { actorType: "user", user, clientId: target.clientId ?? undefined },
      {
        action: "admin.user.password.reset",
        entityType: "User",
        entityId: target.id,
        entityLabel: target.name ?? target.email,
        summary: "Super-admin reset the user's password",
      },
    );

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
