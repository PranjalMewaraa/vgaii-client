import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Appointment from "@/models/Appointment";
import Attachment from "@/models/Attachment";
import { getUser } from "@/middleware/auth";
import { checkRole, checkModule } from "@/lib/rbac";
import { withClientFilter } from "@/lib/query";
import { uploadUrlSchema, sanitizeFilename } from "@/lib/validators/attachment";
import { signPutUrl } from "@/lib/r2";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: RouteContext) {
  try {
    await connectDB();
    const user = getUser(req);
    checkRole(user, ["CLIENT_ADMIN", "STAFF"]);
    checkModule(user, "appointments");

    const { id } = await ctx.params;
    const filter = withClientFilter(user);

    const appointment = await Appointment.findOne({ ...filter, _id: id })
      .select("_id clientId")
      .lean<{ _id: mongoose.Types.ObjectId; clientId: mongoose.Types.ObjectId } | null>();
    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = uploadUrlSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const safeName = sanitizeFilename(parsed.data.filename);

    // Pre-allocate the document _id so we can embed it in the storage key —
    // cheaper than two writes (insert -> update with key).
    const attachmentId = new mongoose.Types.ObjectId();
    const storageKey = `clients/${appointment.clientId.toString()}/appointments/${appointment._id.toString()}/${attachmentId.toString()}-${safeName}`;

    const uploadUrl = await signPutUrl(storageKey, parsed.data.mimeType);

    await Attachment.create({
      _id: attachmentId,
      appointmentId: appointment._id,
      clientId: appointment.clientId,
      uploadedBy: user.id,
      kind: parsed.data.kind,
      filename: safeName,
      mimeType: parsed.data.mimeType,
      size: parsed.data.size,
      storageKey,
      confirmed: false,
    });

    return NextResponse.json({
      attachmentId: attachmentId.toString(),
      storageKey,
      uploadUrl,
    });
  } catch (err: unknown) {
    console.error("[attachments/upload-url] failed:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
