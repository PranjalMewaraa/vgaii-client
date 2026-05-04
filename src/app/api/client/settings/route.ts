import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { getUser } from "@/middleware/auth";
import { clientSettingsSchema } from "@/lib/validators/client";
import { getErrorMessage } from "@/lib/errors";
import { logAudit } from "@/lib/audit";
import { NextResponse } from "next/server";

const cleanString = (v: string | null | undefined): string | null => {
  if (v === null || v === undefined) return null;
  const trimmed = v.trim();
  return trimmed === "" ? null : trimmed;
};

// CLIENT_ADMIN can self-serve only branding-related settings (their public
// slug + custom domain). Integrations like googlePlaceId and bookingUrl,
// plus webhook secrets, are platform-managed via the super-admin clients
// page.
export async function PATCH(req: Request) {
  try {
    const user = getUser(req);

    if (user.role !== "CLIENT_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!user.clientId) {
      return NextResponse.json(
        { error: "No client context" },
        { status: 400 },
      );
    }

    const body = await req.json();
    const parsed = clientSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const data: Record<string, string | null> = {};
    if (parsed.data.profileSlug !== undefined) {
      data.profileSlug = cleanString(parsed.data.profileSlug);
    }
    if (parsed.data.customDomain !== undefined) {
      data.customDomain = cleanString(parsed.data.customDomain);
    }

    let client;
    try {
      client = await prisma.client.update({
        where: { id: user.clientId },
        data,
        select: {
          id: true,
          name: true,
          profileSlug: true,
          customDomain: true,
        },
      });
    } catch (err: unknown) {
      // P2002 = unique constraint violation. P2025 = record not found.
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

    const changed = Object.keys(parsed.data).filter(
      k => parsed.data[k as keyof typeof parsed.data] !== undefined,
    );
    await logAudit(req, { actorType: "user", user }, {
      action: "client.settings.updated",
      entityType: "Client",
      entityId: client.id,
      entityLabel: client.name,
      summary: `Settings updated: ${changed.join(", ") || "no fields"}`,
      metadata: { fields: changed },
    });

    return NextResponse.json({ client });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
