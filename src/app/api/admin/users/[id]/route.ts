import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { getUser } from "@/middleware/auth";
import { getErrorMessage } from "@/lib/errors";
import { logAudit } from "@/lib/audit";
import { NextResponse } from "next/server";
import { z } from "zod";

// Plain regex instead of z.email() so we don't depend on a specific Zod
// minor's email API.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const updateSchema = z
  .object({
    email: z.string().trim().regex(EMAIL_RE, "Enter a valid email").optional(),
    name: z.string().trim().min(1).max(120).optional(),
  })
  .refine(d => d.email !== undefined || d.name !== undefined, {
    message: "Provide an email or name to update",
  });

type RouteContext = { params: Promise<{ id: string }> };

// Super-admin user management: change a user's email and/or display name.
export async function PATCH(req: Request, ctx: RouteContext) {
  try {
    const user = getUser(req);
    if (user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await ctx.params;
    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const update: Record<string, unknown> = {};
    if (parsed.data.email !== undefined) update.email = parsed.data.email;
    if (parsed.data.name !== undefined) update.name = parsed.data.name;

    let updated;
    try {
      updated = await prisma.user.update({
        where: { id },
        data: update,
        select: { id: true, name: true, email: true, role: true, clientId: true },
      });
    } catch (err: unknown) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2002") {
          return NextResponse.json(
            { error: "That email is already in use by another user." },
            { status: 409 },
          );
        }
        if (err.code === "P2025") {
          return NextResponse.json({ error: "User not found" }, { status: 404 });
        }
      }
      throw err;
    }

    await logAudit(
      req,
      { actorType: "user", user, clientId: updated.clientId ?? undefined },
      {
        action: "admin.user.updated",
        entityType: "User",
        entityId: updated.id,
        entityLabel: updated.name ?? updated.email,
        summary: `Super-admin updated user (${Object.keys(update).join(", ")})`,
        metadata: { fields: Object.keys(update) },
      },
    );

    return NextResponse.json({ user: updated });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
