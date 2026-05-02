import { connectDB } from "@/lib/db";
import Client from "@/models/Client";
import { getUser } from "@/middleware/auth";
import { adminClientUpdateSchema } from "@/lib/validators/client";
import { getErrorMessage } from "@/lib/errors";
import { logAudit } from "@/lib/audit";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

const cleanString = (v: string | null | undefined): string | undefined => {
  if (v === null || v === undefined) return undefined;
  const trimmed = v.trim();
  return trimmed === "" ? "" : trimmed;
};

// Super-admin-only client patch. Used to set integration details
// (googlePlaceId, bookingUrl) at any time after creation, plus rename,
// plan, subscription, and the existing branding fields. CLIENT_ADMIN can
// only modify branding via /api/client/settings.
export async function PATCH(req: Request, ctx: RouteContext) {
  try {
    await connectDB();
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

    const client = await Client.findById(id);
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const data = parsed.data;
    if (data.name !== undefined) client.name = data.name;
    if (data.plan !== undefined) client.plan = data.plan;
    if (data.subscriptionStatus !== undefined) {
      client.subscriptionStatus = data.subscriptionStatus;
    }
    if (data.renewalDate !== undefined) {
      client.renewalDate = data.renewalDate ? new Date(data.renewalDate) : undefined;
    }
    if (data.googlePlaceId !== undefined) {
      client.googlePlaceId = data.googlePlaceId ?? undefined;
    }
    if (data.bookingUrl !== undefined) {
      client.bookingUrl = data.bookingUrl ?? undefined;
    }
    if (data.profileSlug !== undefined) {
      const slug = cleanString(data.profileSlug);
      client.profileSlug = slug ? slug : undefined;
    }
    if (data.customDomain !== undefined) {
      const host = cleanString(data.customDomain);
      client.customDomain = host ? host : undefined;
    }

    try {
      await client.save();
    } catch (err: unknown) {
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code?: number }).code === 11000
      ) {
        const dup = (err as { keyPattern?: Record<string, unknown> })
          .keyPattern;
        const field = dup ? Object.keys(dup)[0] : "field";
        return NextResponse.json(
          { error: `That ${field} is already in use by another client.` },
          { status: 409 },
        );
      }
      throw err;
    }

    const changed = Object.keys(data);
    await logAudit(req, { actorType: "user", user }, {
      action: "admin.client.updated",
      entityType: "Client",
      entityId: client._id.toString(),
      entityLabel: client.name,
      summary: `Super-admin updated: ${changed.join(", ") || "no fields"}`,
      metadata: { fields: changed },
    });

    return NextResponse.json({
      client: {
        _id: client._id,
        name: client.name,
        plan: client.plan,
        subscriptionStatus: client.subscriptionStatus,
        renewalDate: client.renewalDate,
        googlePlaceId: client.googlePlaceId,
        bookingUrl: client.bookingUrl,
        profileSlug: client.profileSlug,
        customDomain: client.customDomain,
        webhookKey: client.webhookKey,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
