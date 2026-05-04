import { getUser } from "@/middleware/auth";
import { readCachedReviews } from "@/lib/google-reviews";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

// Returns whatever's in the cache today. The feedbacks page renders this
// immediately; users tap "Refresh" to pull fresh ones from DataForSEO.
export async function GET(req: Request) {
  try {
    const user = getUser(req);
    if (user.role !== "CLIENT_ADMIN" && user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!user.clientId) {
      // SUPER_ADMIN doesn't have a tenant of their own — Google reviews
      // are inherently per-client.
      return NextResponse.json({
        placeIdSet: false,
        reviews: [],
        syncedAt: null,
        pending: false,
      });
    }
    const result = await readCachedReviews(user.clientId);
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
