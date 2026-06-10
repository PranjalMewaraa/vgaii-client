import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Prisma } from "@/generated/prisma/client";
import { getUser } from "@/middleware/auth";
import { getErrorMessage } from "@/lib/errors";
import { logAudit } from "@/lib/audit";
import { NextResponse } from "next/server";
import { z } from "zod";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const schema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newEmail: z.string().trim().regex(EMAIL_RE, "Enter a valid email"),
});

// Self-service email change. Requires the current password (email is the
// login identifier, so we re-authenticate before changing it). Email is not
// part of the JWT, so the existing token stays valid — no re-login needed.
export async function POST(req: Request) {
  try {
    const user = getUser(req);
    if (!user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id: user.id } });
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const ok = await bcrypt.compare(parsed.data.currentPassword, target.password);
    if (!ok) {
      await logAudit(req, { actorType: "user", user }, {
        action: "auth.email.change.failed",
        entityType: "User",
        entityId: target.id,
        entityLabel: target.name ?? target.email,
        summary: "Email change failed (wrong password)",
      });
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 },
      );
    }

    if (parsed.data.newEmail.toLowerCase() === target.email.toLowerCase()) {
      return NextResponse.json(
        { error: "That's already your email" },
        { status: 400 },
      );
    }

    let updated;
    try {
      updated = await prisma.user.update({
        where: { id: target.id },
        data: { email: parsed.data.newEmail },
        select: { id: true, email: true, name: true },
      });
    } catch (err: unknown) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        return NextResponse.json(
          { error: "That email is already in use." },
          { status: 409 },
        );
      }
      throw err;
    }

    await logAudit(req, { actorType: "user", user }, {
      action: "auth.email.changed",
      entityType: "User",
      entityId: updated.id,
      entityLabel: updated.name ?? updated.email,
      summary: "Email changed",
    });

    return NextResponse.json({ email: updated.email });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
