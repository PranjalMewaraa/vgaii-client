import { connectDB } from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { getUser } from "@/middleware/auth";
import { staffUpdateSchema } from "@/lib/validators/staff";
import { getErrorMessage } from "@/lib/errors";
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

    if (parsed.data.name !== undefined) target.name = parsed.data.name;
    if (parsed.data.assignedModules !== undefined) {
      target.assignedModules = parsed.data.assignedModules;
    }
    if (parsed.data.password !== undefined) {
      target.password = await bcrypt.hash(parsed.data.password, 10);
    }

    await target.save();

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

    const result = await User.deleteOne({
      _id: id,
      clientId: user.clientId,
      role: "STAFF",
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
