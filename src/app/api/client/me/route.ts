import { connectDB } from "@/lib/db";
import Client from "@/models/Client";
import { getUser } from "@/middleware/auth";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    await connectDB();

    const user = getUser(req);

    if (user.role === "SUPER_ADMIN") {
      return NextResponse.json({ error: "Use admin APIs" }, { status: 403 });
    }

    if (!user.clientId) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const client = await Client.findById(user.clientId);

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const origin = req.headers.get("origin") ?? new URL(req.url).origin;

    return NextResponse.json({
      client: {
        id: client._id,
        name: client.name,
        plan: client.plan,
        subscriptionStatus: client.subscriptionStatus,
        renewalDate: client.renewalDate,
        googlePlaceId: client.googlePlaceId,
        calendlySchedulingUrl: client.calendlySchedulingUrl,
        profileSlug: client.profileSlug,
        customDomain: client.customDomain,
        webhookKey: client.webhookKey,
      },
      integrations: {
        leadWebhookUrl: `${origin}/api/webhooks/leads`,
        leadStatusWebhookUrl: `${origin}/api/webhooks/leads/status`,
        calendlyWebhookUrl: `${origin}/api/webhooks/calendly`,
        feedbackUrlPattern: `${origin}/feedback/<token>`,
      },
    });

  } catch (err: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(err) },
      { status: 500 },
    );
  }
}
