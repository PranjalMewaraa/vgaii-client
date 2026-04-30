import { connectDB } from "@/lib/db";
import Client from "@/models/Client";
import { getUser } from "@/middleware/auth";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

export async function PATCH(req: Request) {
  try {
    await connectDB();

    const user = getUser(req);

    // 🔐 Only client admin allowed
    if (user.role !== "CLIENT_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    if (!user.clientId) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    const newKey = randomBytes(16).toString("hex");

    const client = await Client.findByIdAndUpdate(
      user.clientId,
      {
        calendlyWebhookKey: newKey,
      },
      { new: true }
    );

    return NextResponse.json({
      message: "Webhook key regenerated",
      calendlyWebhookKey: client?.calendlyWebhookKey,
    });

  } catch (err: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(err) },
      { status: 500 }
    );
  }
}
