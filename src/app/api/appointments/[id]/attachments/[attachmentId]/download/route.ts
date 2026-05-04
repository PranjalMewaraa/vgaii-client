import { prisma } from "@/lib/prisma";
import { getUser } from "@/middleware/auth";
import { checkRole, checkModule } from "@/lib/rbac";
import { withClientFilter } from "@/lib/query";
import { signGetUrl } from "@/lib/r2";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ id: string; attachmentId: string }>;
};

export async function GET(req: Request, ctx: RouteContext) {
  try {
    const user = getUser(req);
    checkRole(user, ["CLIENT_ADMIN", "STAFF"]);
    checkModule(user, "appointments");

    const { id, attachmentId } = await ctx.params;
    const scope = withClientFilter(user) as { clientId?: string };

    const appointment = await prisma.appointment.findFirst({
      where: { id, ...scope },
      select: { id: true },
    });
    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const attachment = await prisma.attachment.findFirst({
      where: { id: attachmentId, appointmentId: id, confirmed: true },
      select: { storageKey: true, filename: true },
    });
    if (!attachment) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    const url = await signGetUrl(attachment.storageKey, 600, attachment.filename);

    // 302 to the presigned URL so a click on a regular <a> tag downloads
    // straight from R2 without proxying bytes through Next.js.
    return NextResponse.redirect(url, 302);
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
