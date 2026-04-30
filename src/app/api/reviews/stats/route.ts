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

    const [positive, negative] = await Promise.all([
      Review.countDocuments(
        withClientFilter(user, {
          sentiment: "positive",
        }),
      ),
      Review.countDocuments(
        withClientFilter(user, {
          sentiment: "negative",
        }),
      ),
    ]);

    return NextResponse.json({ positive, negative });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
