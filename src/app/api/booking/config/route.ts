import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { getUser } from "@/middleware/auth";
import { checkRole, checkModule } from "@/lib/rbac";
import { bookingConfigSchema } from "@/lib/validators/bookingConfig";
import { getBookingConfig } from "@/lib/booking";
import { getErrorMessage } from "@/lib/errors";
import { logAudit } from "@/lib/audit";
import { NextResponse } from "next/server";

// Per-client booking availability config. Read by any appointments-module
// user (the SlotPicker needs it); written by CLIENT_ADMIN only.
export async function GET(req: Request) {
  try {
    const user = getUser(req);
    checkRole(user, ["CLIENT_ADMIN", "STAFF"]);
    checkModule(user, "appointments");
    if (!user.clientId) {
      return NextResponse.json({ error: "No client context" }, { status: 400 });
    }

    const client = await prisma.client.findUnique({
      where: { id: user.clientId },
      select: { bookingConfig: true },
    });
    return NextResponse.json({ config: getBookingConfig(client?.bookingConfig) });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = getUser(req);
    if (user.role !== "CLIENT_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!user.clientId) {
      return NextResponse.json({ error: "No client context" }, { status: 400 });
    }

    const parsed = bookingConfigSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const client = await prisma.client.update({
      where: { id: user.clientId },
      data: { bookingConfig: parsed.data as unknown as Prisma.InputJsonValue },
      select: { id: true, name: true, bookingConfig: true },
    });

    await logAudit(req, { actorType: "user", user }, {
      action: "client.bookingConfig.updated",
      entityType: "Client",
      entityId: client.id,
      entityLabel: client.name,
      summary: `Booking config updated (${parsed.data.enabled ? "enabled" : "disabled"})`,
      metadata: { enabled: parsed.data.enabled, timezone: parsed.data.timezone },
    });

    return NextResponse.json({ config: getBookingConfig(client.bookingConfig) });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
