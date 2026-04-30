import { connectDB } from "@/lib/db";
import Client from "@/models/Client";
import { getUser } from "@/middleware/auth";
import { createReviewTask } from "@/lib/dataforseo";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    await connectDB();

    const user = getUser(req);

    if (user.role !== "CLIENT_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const client = await Client.findById(user.clientId);

    if (!client?.googlePlaceId) {
      return NextResponse.json(
        { error: "Missing place_id" },
        { status: 400 }
      );
    }

    const taskId = await createReviewTask(client.googlePlaceId);

    client.reviewsTaskId = taskId;
    await client.save();

    return NextResponse.json({ taskId });

  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
