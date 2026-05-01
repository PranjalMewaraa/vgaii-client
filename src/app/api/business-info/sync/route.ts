import { connectDB } from "@/lib/db";
import Client from "@/models/Client";
import { getUser } from "@/middleware/auth";
import { fetchBusinessInfo } from "@/lib/business-info";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    await connectDB();

    const user = getUser(req);

    if (!user.clientId) {
      return NextResponse.json(
        { error: "No client context" },
        { status: 400 }
      );
    }

    const client = await Client.findById(user.clientId);

    if (!client?.googlePlaceId) {
      return NextResponse.json(
        { error: "Missing place_id" },
        { status: 400 }
      );
    }

    const businessInfo = await fetchBusinessInfo(client.googlePlaceId);

    if (!businessInfo) {
      return NextResponse.json(
        { error: "DataForSEO returned no business info for this place_id" },
        { status: 502 }
      );
    }

    client.googleBusinessInfo = businessInfo;
    await client.save();

    return NextResponse.json({ businessInfo });

  } catch (err: unknown) {
    console.error("[business-info/sync] failed:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
