import { connectDB } from "@/lib/db";
import Client from "@/models/Client";
import { getUser } from "@/middleware/auth";
import { clientSettingsSchema } from "@/lib/validators/client";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

export async function PATCH(req: Request) {
  try {
    await connectDB();
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

    const client = await Client.findById(user.clientId);
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    if (parsed.data.googlePlaceId !== undefined) {
      client.googlePlaceId = parsed.data.googlePlaceId ?? undefined;
    }
    if (parsed.data.calendlySchedulingUrl !== undefined) {
      client.calendlySchedulingUrl =
        parsed.data.calendlySchedulingUrl ?? undefined;
    }

    await client.save();

    return NextResponse.json({
      client: {
        id: client._id,
        name: client.name,
        googlePlaceId: client.googlePlaceId,
        calendlySchedulingUrl: client.calendlySchedulingUrl,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
