import { getUser } from "@/middleware/auth";
import { refreshClientReviews } from "@/lib/google-reviews";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

// 30s upper bound: helper polls for ~25s, plus we want headroom for
// outbound DataForSEO calls. Vercel's default function timeout is 10s on
// Hobby; on Pro the dashboard can be configured higher. If the request
// itself times out, the task is still queued at DataForSEO and will be
// picked up on the next refresh.
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const user = getUser(req);
    if (user.role !== "CLIENT_ADMIN" && user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!user.clientId) {
      return NextResponse.json(
        { error: "No tenant scope on this user" },
        { status: 400 },
      );
    }

    const result = await refreshClientReviews(user.clientId);
    if (result.status === "no-place-id") {
      return NextResponse.json(
        {
          status: "no-place-id",
          error:
            "Set the Google Place ID for this client first (Integrations panel).",
        },
        { status: 400 },
      );
    }
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
