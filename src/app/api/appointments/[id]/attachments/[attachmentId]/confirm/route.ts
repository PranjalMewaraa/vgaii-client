import { prisma } from "@/lib/prisma";
import { getUser } from "@/middleware/auth";
import { checkRole, checkModule } from "@/lib/rbac";
import { withClientFilter } from "@/lib/query";
import { headObject } from "@/lib/r2";
import { logAudit } from "@/lib/audit";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ id: string; attachmentId: string }>;
};

export async function POST(req: Request, ctx: RouteContext) {
  try {
    const user = getUser(req);
    checkRole(user, ["CLIENT_ADMIN", "STAFF"]);
    checkModule(user, "appointments");

    const { id, attachmentId } = await ctx.params;
    const scope = withClientFilter(user) as { clientId?: string };

    const appointment = await prisma.appointment.findFirst({
      where: { id, ...scope },
      select: { id: true, date: true, name: true },
    });
    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const attachment = await prisma.attachment.findFirst({
      where: { id: attachmentId, appointmentId: id },
    });
    if (!attachment) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    // Verify the upload actually landed in R2. Mismatched size would mean
    // the browser sent something different from what it told us — reject
    // and let the client retry.
    const head = await headObject(attachment.storageKey);
    if (!head) {
      return NextResponse.json(
        { error: "Upload not found in storage. Try again." },
        { status: 409 },
      );
    }
    if (head.size !== attachment.size) {
      return NextResponse.json(
        { error: "Uploaded file size does not match what was reserved." },
        { status: 409 },
      );
    }

    const confirmed = await prisma.attachment.update({
      where: { id: attachment.id },
      data: { confirmed: true },
    });

    const apptLabel = appointment.date
      ? `${appointment.name ?? "Appointment"} · ${new Date(appointment.date).toLocaleString()}`
      : appointment.name ?? "Appointment";

    await logAudit(req, { actorType: "user", user }, {
      action: "appointment.attachment.uploaded",
      entityType: "Appointment",
      entityId: appointment.id,
      entityLabel: apptLabel,
      summary: `Uploaded "${confirmed.filename}" (${Math.round(confirmed.size / 1024)} KB, ${confirmed.kind})`,
      metadata: {
        attachmentId: confirmed.id,
        filename: confirmed.filename,
        size: confirmed.size,
        mimeType: confirmed.mimeType,
        kind: confirmed.kind,
      },
    });

    return NextResponse.json({
      attachment: {
        id: confirmed.id,
        filename: confirmed.filename,
        mimeType: confirmed.mimeType,
        size: confirmed.size,
        kind: confirmed.kind,
        createdAt: confirmed.createdAt,
      },
    });
  } catch (err: unknown) {
    console.error("[attachments/confirm] failed:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
