import { getUser } from "@/middleware/auth";
import { refreshClientReviews } from "@/lib/google-reviews";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

// 15s is plenty: refreshClientReviews now returns immediately after one
// of (a) opportunistically checking an in-flight task, or (b) submitting
// a new task. No more long server-held polling — the client polls the
// read endpoint, which lazy-advances the task on every GET.
export const maxDuration = 15;

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
