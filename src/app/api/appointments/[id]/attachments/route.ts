import { prisma } from "@/lib/prisma";
import { getUser } from "@/middleware/auth";
import { checkRole, checkModule } from "@/lib/rbac";
import { withClientFilter } from "@/lib/query";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

const PENDING_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function GET(req: Request, ctx: RouteContext) {
  try {
    const user = getUser(req);
    checkRole(user, ["CLIENT_ADMIN", "STAFF"]);
    checkModule(user, "appointments");

    const { id } = await ctx.params;
    const scope = withClientFilter(user) as { clientId?: string };

    const appointment = await prisma.appointment.findFirst({
      where: { id, ...scope },
      select: { id: true },
    });
    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    // Lazy janitor: drop unconfirmed rows older than the TTL. Keeps the DB
    // tidy without needing a scheduled cron. Orphan R2 objects from
    // abandoned uploads are not swept here — that needs a periodic job.
    await prisma.attachment.deleteMany({
      where: {
        appointmentId: id,
        confirmed: false,
        createdAt: { lt: new Date(Date.now() - PENDING_TTL_MS) },
      },
    });

    // Single query with `include: { uploadedBy }` does the join Mongoose
    // needed two round-trips for. Selecting only the user fields we display.
    const rows = await prisma.attachment.findMany({
      where: { appointmentId: id, confirmed: true },
      orderBy: { createdAt: "desc" },
      include: {
        uploadedBy: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({
      attachments: rows.map(r => ({
        id: r.id,
        filename: r.filename,
        mimeType: r.mimeType,
        size: r.size,
        kind: r.kind,
        uploadedAt: r.createdAt,
        uploadedBy: r.uploadedBy
          ? r.uploadedBy.name || r.uploadedBy.email || "—"
          : null,
      })),
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
