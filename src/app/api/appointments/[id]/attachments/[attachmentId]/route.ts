import { connectDB } from "@/lib/db";
import Appointment from "@/models/Appointment";
import Attachment from "@/models/Attachment";
import { getUser } from "@/middleware/auth";
import { checkRole, checkModule } from "@/lib/rbac";
import { withClientFilter } from "@/lib/query";
import { deleteObject } from "@/lib/r2";
import { logAudit } from "@/lib/audit";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ id: string; attachmentId: string }>;
};

export async function DELETE(req: Request, ctx: RouteContext) {
  try {
    await connectDB();
    const user = getUser(req);
    checkRole(user, ["CLIENT_ADMIN", "STAFF"]);
    checkModule(user, "appointments");

    const { id, attachmentId } = await ctx.params;
    const filter = withClientFilter(user);

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

    // Delete from R2 first; if it fails, leave the DB row so we don't lose
    // the audit trail of the file's existence. Best-effort: an R2 delete
    // failure is logged and surfaced, but the row stays.
    try {
      await deleteObject(attachment.storageKey);
    } catch (err) {
      console.error("[attachments/delete] R2 delete failed:", err);
      return NextResponse.json(
        { error: "Failed to remove file from storage. Try again." },
        { status: 502 },
      );
    }

    await Attachment.deleteOne({ _id: attachment._id });

    const apptLabel = appointment.date
      ? `${appointment.name ?? "Appointment"} · ${new Date(appointment.date).toLocaleString()}`
      : appointment.name ?? "Appointment";

    await logAudit(req, { actorType: "user", user }, {
      action: "appointment.attachment.deleted",
      entityType: "Appointment",
      entityId: String(appointment._id),
      entityLabel: apptLabel,
      summary: `Deleted "${attachment.filename}" (${attachment.kind})`,
      metadata: {
        attachmentId: attachment._id.toString(),
        filename: attachment.filename,
        size: attachment.size,
        mimeType: attachment.mimeType,
        kind: attachment.kind,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("[attachments/delete] failed:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
