import { prisma } from "@/lib/prisma";
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
    const user = getUser(req);
    checkRole(user, ["CLIENT_ADMIN", "STAFF"]);
    checkModule(user, "appointments");

    const { id } = await ctx.params;
    const scope = withClientFilter(user) as { clientId?: string };

    const appointment = await prisma.appointment.findFirst({
      where: { id, ...scope },
      select: { id: true, clientId: true },
    });
    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = uploadUrlSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const safeName = sanitizeFilename(parsed.data.filename);

    // Create the attachment row first; Prisma fills in the cuid PK that we
    // then embed in the R2 storage key. One extra write vs Mongo's
    // pre-allocated ObjectId pattern, but cleaner — no manual ID generation.
    const attachment = await prisma.attachment.create({
      data: {
        appointmentId: appointment.id,
        clientId: appointment.clientId,
        uploadedById: user.id,
        kind: parsed.data.kind,
        filename: safeName,
        mimeType: parsed.data.mimeType,
        size: parsed.data.size,
        storageKey: "pending", // overwritten below
        confirmed: false,
      },
    });

    const storageKey = `clients/${appointment.clientId}/appointments/${appointment.id}/${attachment.id}-${safeName}`;

    await prisma.attachment.update({
      where: { id: attachment.id },
      data: { storageKey },
    });

    const uploadUrl = await signPutUrl(storageKey, parsed.data.mimeType);

    return NextResponse.json({
      attachmentId: attachment.id,
      storageKey,
      uploadUrl,
    });
  } catch (err: unknown) {
    console.error("[attachments/upload-url] failed:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
