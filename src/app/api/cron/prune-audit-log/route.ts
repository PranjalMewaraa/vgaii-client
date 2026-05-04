import { pruneOldAuditEntries } from "@/lib/audit-prune";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

// Protected cron endpoint. Triggered by Railway's scheduled job runner
// (or any external cron — cron-job.org, GitHub Actions, etc) hitting:
//
//   POST /api/cron/prune-audit-log
//   Header:  x-cron-secret: <CRON_SECRET>
//   Body:    { "retentionDays": 180 }   (optional, defaults to 180)
//
// The shared-secret pattern matches what the webhook routes use — easy
// to rotate, no per-caller setup. Returns the count of rows actually
// deleted plus the cutoff timestamp so logs are auditable.
export async function POST(req: Request) {
  try {
    const expected = process.env.CRON_SECRET;
    if (!expected) {
      return NextResponse.json(
        { error: "CRON_SECRET not configured" },
        { status: 500 },
      );
    }
    const provided = req.headers.get("x-cron-secret");
    if (provided !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let retentionDays: number | undefined;
    if (req.headers.get("content-type")?.includes("application/json")) {
      const body = (await req.json().catch(() => ({}))) as {
        retentionDays?: unknown;
      };
      if (typeof body.retentionDays === "number" && body.retentionDays > 0) {
        retentionDays = Math.floor(body.retentionDays);
      }
    }

    const result = await pruneOldAuditEntries(retentionDays);
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
