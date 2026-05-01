import { connectDB } from "@/lib/db";
import Client from "@/models/Client";
import { getUser } from "@/middleware/auth";
import { clientSettingsSchema } from "@/lib/validators/client";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

const cleanString = (v: string | null | undefined): string | undefined => {
  if (v === null || v === undefined) return undefined;
  const trimmed = v.trim();
  return trimmed === "" ? "" : trimmed;
};

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
    if (parsed.data.profileSlug !== undefined) {
      const slug = cleanString(parsed.data.profileSlug);
      client.profileSlug = slug ? slug : undefined;
    }
    if (parsed.data.customDomain !== undefined) {
      const host = cleanString(parsed.data.customDomain);
      client.customDomain = host ? host : undefined;
    }

    try {
      await client.save();
    } catch (err: unknown) {
      // Mongo duplicate-key error code 11000.
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

    return NextResponse.json({
      client: {
        id: client._id,
        name: client.name,
        googlePlaceId: client.googlePlaceId,
        calendlySchedulingUrl: client.calendlySchedulingUrl,
        profileSlug: client.profileSlug,
        customDomain: client.customDomain,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
