import { connectDB } from "@/lib/db";
import Review from "@/models/Review";
import { getUser } from "@/middleware/auth";
import { withClientFilter } from "@/lib/query";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    await connectDB();

    const user = getUser(req);

    const reviews = await Review.find(
      withClientFilter(user)
    ).sort({ createdAtSource: -1 });

    return NextResponse.json({ reviews });

  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
