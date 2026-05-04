import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { getUser } from "@/middleware/auth";
import { adminClientUpdateSchema } from "@/lib/validators/client";
import { getErrorMessage } from "@/lib/errors";
import { logAudit } from "@/lib/audit";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

const cleanString = (v: string | null | undefined): string | null => {
  if (v === null || v === undefined) return null;
  const trimmed = v.trim();
  return trimmed === "" ? null : trimmed;
};

// Super-admin-only client patch. Used to set integration details
// (googlePlaceId, bookingUrl) at any time after creation, plus rename,
// plan, subscription, and the existing branding fields. CLIENT_ADMIN can
// only modify branding via /api/client/settings.
export async function PATCH(req: Request, ctx: RouteContext) {
  try {
    const user = getUser(req);

    if (user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await ctx.params;

    const body = await req.json();
    const parsed = adminClientUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const data = parsed.data;
    const update: Record<string, unknown> = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.plan !== undefined) update.plan = data.plan;
    if (data.subscriptionStatus !== undefined) {
      update.subscriptionStatus = data.subscriptionStatus;
    }
    if (data.renewalDate !== undefined) {
      update.renewalDate = data.renewalDate ? new Date(data.renewalDate) : null;
    }
    if (data.googlePlaceId !== undefined) {
      update.googlePlaceId = data.googlePlaceId ?? null;
    }
    if (data.bookingUrl !== undefined) {
      update.bookingUrl = data.bookingUrl ?? null;
    }
    if (data.profileSlug !== undefined) {
      update.profileSlug = cleanString(data.profileSlug);
    }
    if (data.customDomain !== undefined) {
      update.customDomain = cleanString(data.customDomain);
    }

    let client;
    try {
      client = await prisma.client.update({
        where: { id },
        data: update,
        select: {
          id: true,
          name: true,
          plan: true,
          subscriptionStatus: true,
          renewalDate: true,
          googlePlaceId: true,
          bookingUrl: true,
          profileSlug: true,
          customDomain: true,
          webhookKey: true,
        },
      });
    } catch (err: unknown) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2002") {
          const target = (err.meta?.target as string[] | undefined)?.[0] ?? "field";
          return NextResponse.json(
            { error: `That ${target} is already in use by another client.` },
            { status: 409 },
          );
        }
        if (err.code === "P2025") {
          return NextResponse.json(
            { error: "Client not found" },
            { status: 404 },
          );
        }
      }
      throw err;
    }

    const changed = Object.keys(data);
    await logAudit(req, { actorType: "user", user }, {
      action: "admin.client.updated",
      entityType: "Client",
      entityId: client.id,
      entityLabel: client.name,
      summary: `Super-admin updated: ${changed.join(", ") || "no fields"}`,
      metadata: { fields: changed },
    });

    return NextResponse.json({ client });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
