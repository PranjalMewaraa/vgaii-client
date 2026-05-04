import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { getUser } from "@/middleware/auth";
import { fetchBusinessInfo } from "@/lib/business-info";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const user = getUser(req);

    if (!user.clientId) {
      return NextResponse.json({ error: "No client context" }, { status: 400 });
    }

    const client = await prisma.client.findUnique({
      where: { id: user.clientId },
      select: { id: true, googlePlaceId: true },
    });

    if (!client?.googlePlaceId) {
      return NextResponse.json({ error: "Missing place_id" }, { status: 400 });
    }

    const businessInfo = await fetchBusinessInfo(client.googlePlaceId);

    if (!businessInfo) {
      return NextResponse.json(
        { error: "DataForSEO returned no business info for this place_id" },
        { status: 502 },
      );
    }

    await prisma.client.update({
      where: { id: client.id },
      data: { googleBusinessInfo: businessInfo as unknown as Prisma.InputJsonValue },
    });

    return NextResponse.json({ businessInfo });
  } catch (err: unknown) {
    console.error("[business-info/sync] failed:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
