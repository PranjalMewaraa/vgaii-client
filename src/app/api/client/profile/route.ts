import { connectDB } from "@/lib/db";
import Client from "@/models/Client";
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
    await connectDB();
    const user = getUser(req);
    const block = requireAdmin(user);
    if (block) return block;

    const client = await Client.findById(user.clientId)
      .select("profile")
      .lean();

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
    await connectDB();
    const user = getUser(req);
    const block = requireAdmin(user);
    if (block) return block;

    const body = await req.json();
    const parsed = profileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const client = await Client.findByIdAndUpdate(
      user.clientId,
      { profile: parsed.data },
      { new: true },
    ).select("profile");

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    await logAudit(req, { actorType: "user", user }, {
      action: "client.profile.updated",
      entityType: "Client",
      entityId: client._id.toString(),
      summary: "Public profile updated",
    });

    return NextResponse.json({ profile: client.profile });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
