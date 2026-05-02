import { connectDB } from "@/lib/db";
import User from "@/models/User";
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
    await connectDB();
    const user = getUser(req);
    const block = requireAdmin(user);
    if (block) return block;

    const { id } = await ctx.params;

    const body = await req.json();
    const parsed = staffUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const target = await User.findOne({
      _id: id,
      clientId: user.clientId,
      role: "STAFF",
    });

    if (!target) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    const changedFields: string[] = [];
    if (parsed.data.name !== undefined) {
      target.name = parsed.data.name;
      changedFields.push("name");
    }
    if (parsed.data.assignedModules !== undefined) {
      target.assignedModules = parsed.data.assignedModules;
      changedFields.push("modules");
    }
    if (parsed.data.password !== undefined) {
      target.password = await bcrypt.hash(parsed.data.password, 10);
      changedFields.push("password");
    }

    await target.save();

    await logAudit(req, { actorType: "user", user }, {
      action: "staff.updated",
      entityType: "User",
      entityId: target._id.toString(),
      entityLabel: target.name ?? target.email ?? "Staff",
      summary: `Updated: ${changedFields.join(", ") || "no fields"}`,
      metadata: { fields: changedFields },
    });

    return NextResponse.json({
      staff: {
        _id: target._id,
        name: target.name,
        email: target.email,
        assignedModules: target.assignedModules,
        createdAt: target.createdAt,
        createdBy: target.createdBy,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function DELETE(req: Request, ctx: RouteContext) {
  try {
    await connectDB();
    const user = getUser(req);
    const block = requireAdmin(user);
    if (block) return block;

    const { id } = await ctx.params;

    const target = await User.findOne({
      _id: id,
      clientId: user.clientId,
      role: "STAFF",
    }).lean<{ _id: unknown; name?: string; email?: string } | null>();

    const result = await User.deleteOne({
      _id: id,
      clientId: user.clientId,
      role: "STAFF",
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    if (target) {
      await logAudit(req, { actorType: "user", user }, {
        action: "staff.deleted",
        entityType: "User",
        entityId: String(target._id),
        entityLabel: target.name ?? target.email ?? "Staff",
        summary: "Staff account removed",
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
