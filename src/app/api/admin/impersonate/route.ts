import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Client from "@/models/Client";
import { generateToken } from "@/lib/auth";
import { getUser } from "@/middleware/auth";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    await connectDB();
    const user = getUser(req);

    if (user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { userId, clientId } = body as {
      userId?: string;
      clientId?: string;
    };

    let target: typeof User.prototype | null = null;

    if (userId) {
      target = await User.findById(userId);
    } else if (clientId) {
      // Backwards-compat: impersonate the CLIENT_ADMIN of a given client.
      target = await User.findOne({ clientId, role: "CLIENT_ADMIN" });
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
      ? await Client.findById(target.clientId).select("name").lean<{
          _id: { toString(): string };
          name?: string;
        }>()
      : null;

    const token = generateToken({
      id: target._id.toString(),
      role: target.role,
      clientId: target.clientId?.toString() ?? null,
      assignedModules: target.assignedModules ?? [],
      impersonatedBy: user.id ?? "SUPER_ADMIN",
    });

    return NextResponse.json({
      token,
      user: {
        id: target._id.toString(),
        name: target.name,
        email: target.email,
        role: target.role,
        clientId: target.clientId?.toString() ?? null,
        clientName: client?.name ?? null,
        assignedModules: target.assignedModules ?? [],
        impersonatedBy: user.id ?? "SUPER_ADMIN",
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
