import { connectDB } from "@/lib/db";
import Appointment from "@/models/Appointment";
import Attachment from "@/models/Attachment";
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
    await connectDB();
    const user = getUser(req);
    checkRole(user, ["CLIENT_ADMIN", "STAFF"]);
    checkModule(user, "appointments");

    const { id, attachmentId } = await ctx.params;
    const filter = withClientFilter(user);

    // Single round-trip: load the attachment and join-check the appointment
    // by clientId. Both shape the response for the UI.
    const appointment = await Appointment.findOne({ ...filter, _id: id })
      .select("_id date name")
      .lean<{ _id: unknown; date?: Date; name?: string } | null>();
    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const attachment = await Attachment.findOne({
      _id: attachmentId,
      appointmentId: id,
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

    attachment.confirmed = true;
    await attachment.save();

    const apptLabel = appointment.date
      ? `${appointment.name ?? "Appointment"} · ${new Date(appointment.date).toLocaleString()}`
      : appointment.name ?? "Appointment";

    await logAudit(req, { actorType: "user", user }, {
      action: "appointment.attachment.uploaded",
      entityType: "Appointment",
      entityId: String(appointment._id),
      entityLabel: apptLabel,
      summary: `Uploaded "${attachment.filename}" (${Math.round(attachment.size / 1024)} KB, ${attachment.kind})`,
      metadata: {
        attachmentId: attachment._id.toString(),
        filename: attachment.filename,
        size: attachment.size,
        mimeType: attachment.mimeType,
        kind: attachment.kind,
      },
    });

    return NextResponse.json({
      attachment: {
        id: attachment._id.toString(),
        filename: attachment.filename,
        mimeType: attachment.mimeType,
        size: attachment.size,
        kind: attachment.kind,
        createdAt: attachment.createdAt,
      },
    });
  } catch (err: unknown) {
    console.error("[attachments/confirm] failed:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
