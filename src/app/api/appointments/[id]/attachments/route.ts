import { connectDB } from "@/lib/db";
import Appointment from "@/models/Appointment";
import Attachment from "@/models/Attachment";
import User from "@/models/User";
import { getUser } from "@/middleware/auth";
import { checkRole, checkModule } from "@/lib/rbac";
import { withClientFilter } from "@/lib/query";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

const PENDING_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function GET(req: Request, ctx: RouteContext) {
  try {
    await connectDB();
    const user = getUser(req);
    checkRole(user, ["CLIENT_ADMIN", "STAFF"]);
    checkModule(user, "appointments");

    const { id } = await ctx.params;
    const filter = withClientFilter(user);

    const appointment = await Appointment.findOne({ ...filter, _id: id })
      .select("_id")
      .lean<{ _id: unknown } | null>();
    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    // Lazy janitor: drop unconfirmed rows older than the TTL. Keeps the DB
    // tidy without needing a scheduled cron. Orphan R2 objects from
    // abandoned uploads are not swept here — that needs a periodic job.
    await Attachment.deleteMany({
      appointmentId: id,
      confirmed: false,
      createdAt: { $lt: new Date(Date.now() - PENDING_TTL_MS) },
    });

    const rows = await Attachment.find({ appointmentId: id, confirmed: true })
      .sort({ createdAt: -1 })
      .lean<
        Array<{
          _id: unknown;
          filename: string;
          mimeType: string;
          size: number;
          kind: string;
          uploadedBy?: unknown;
          createdAt: Date;
        }>
      >();

    // Resolve uploader names in a single round-trip. Audit log denormalizes
    // these per-row, but the attachment list is small enough (and hot
    // enough on the appointment view) that we'd rather keep the row lean
    // and join just-in-time.
    const uploaderIds = Array.from(
      new Set(rows.map(r => r.uploadedBy?.toString()).filter(Boolean) as string[]),
    );
    const uploaders = uploaderIds.length
      ? await User.find({ _id: { $in: uploaderIds } })
          .select("_id name email")
          .lean<Array<{ _id: unknown; name?: string; email?: string }>>()
      : [];
    const nameById = new Map<string, string>();
    for (const u of uploaders) {
      nameById.set(String(u._id), u.name || u.email || "—");
    }

    return NextResponse.json({
      attachments: rows.map(r => ({
        id: String(r._id),
        filename: r.filename,
        mimeType: r.mimeType,
        size: r.size,
        kind: r.kind,
        uploadedAt: r.createdAt,
        uploadedBy: r.uploadedBy ? nameById.get(String(r.uploadedBy)) ?? null : null,
      })),
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
