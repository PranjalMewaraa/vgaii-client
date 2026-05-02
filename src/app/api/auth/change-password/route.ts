import { connectDB } from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { getUser } from "@/middleware/auth";
import { passwordPolicy } from "@/lib/password-policy";
import { getErrorMessage } from "@/lib/errors";
import { logAudit } from "@/lib/audit";
import { NextResponse } from "next/server";
import { z } from "zod";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordPolicy,
});

export async function POST(req: Request) {
  try {
    await connectDB();
    const user = getUser(req);

    if (!user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const target = await User.findById(user.id);
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const ok = await bcrypt.compare(
      parsed.data.currentPassword,
      target.password,
    );
    if (!ok) {
      await logAudit(req, { actorType: "user", user }, {
        action: "auth.password.change.failed",
        entityType: "User",
        entityId: target._id.toString(),
        entityLabel: target.name ?? target.email,
        summary: "Password change failed (wrong current password)",
      });
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 },
      );
    }

    if (parsed.data.currentPassword === parsed.data.newPassword) {
      return NextResponse.json(
        { error: "New password must differ from current" },
        { status: 400 },
      );
    }

    target.password = await bcrypt.hash(parsed.data.newPassword, 10);
    await target.save();

    await logAudit(req, { actorType: "user", user }, {
      action: "auth.password.changed",
      entityType: "User",
      entityId: target._id.toString(),
      entityLabel: target.name ?? target.email,
      summary: "Password changed",
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
