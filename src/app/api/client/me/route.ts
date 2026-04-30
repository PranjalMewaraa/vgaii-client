import { connectDB } from "@/lib/db";
import Client from "@/models/Client";
import { getUser } from "@/middleware/auth";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    await connectDB();

    const user = getUser(req);

    // ❌ SUPER_ADMIN should not use this endpoint
    if (user.role === "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Use admin APIs" },
        { status: 403 }
      );
    }

    if (!user.clientId) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    const client = await Client.findById(user.clientId);

    if (!client) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      client: {
        id: client._id,
        name: client.name,
        plan: client.plan,
        subscriptionStatus: client.subscriptionStatus,
        renewalDate: client.renewalDate,
        googlePlaceId: client.googlePlaceId,
        calendlyWebhookKey: client.calendlyWebhookKey, // ✅ important
      },
    });

  } catch (err: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(err) },
      { status: 500 }
    );
  }
}
