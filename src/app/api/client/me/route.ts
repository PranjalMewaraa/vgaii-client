import { prisma } from "@/lib/prisma";
import { getUser } from "@/middleware/auth";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

// Returns only the fields a CLIENT_ADMIN should see about their own tenant.
// Platform-managed values (googlePlaceId, bookingUrl, webhookKey) and the
// webhook integration URLs are intentionally excluded — they live on the
// super-admin clients page only. The dashboard, public profile, and
// patient/lead detail pages still read googlePlaceId / bookingUrl through
// dedicated endpoints that don't expose them in plaintext to the user.
export async function GET(req: Request) {
  try {
    const user = getUser(req);

    if (user.role === "SUPER_ADMIN") {
      return NextResponse.json({ error: "Use admin APIs" }, { status: 403 });
    }

    if (!user.clientId) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const client = await prisma.client.findUnique({
      where: { id: user.clientId },
      select: {
        id: true,
        name: true,
        plan: true,
        subscriptionStatus: true,
        renewalDate: true,
        profileSlug: true,
        customDomain: true,
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json({ client });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(err) },
      { status: 500 },
    );
  }
}
