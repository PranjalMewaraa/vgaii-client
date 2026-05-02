import { connectDB } from "@/lib/db";
import Lead from "@/models/Lead";
import { getUser } from "@/middleware/auth";
import { withClientFilter } from "@/lib/query";
import { getErrorMessage } from "@/lib/errors";
import { logAudit } from "@/lib/audit";
import { NextResponse } from "next/server";
import { z } from "zod";

const bulkSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(500),
  action: z.enum(["set_source"]),
  value: z.string().trim().max(120).optional(),
});

export async function POST(req: Request) {
  try {
    await connectDB();
    const user = getUser(req);

    if (user.role !== "CLIENT_ADMIN" && user.role !== "STAFF") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!user.clientId) {
      return NextResponse.json({ error: "No client context" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = bulkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const filter = withClientFilter(user);
    const baseQuery = { ...filter, _id: { $in: parsed.data.ids } };

    if (parsed.data.action === "set_source") {
      const value = parsed.data.value?.trim();
      if (!value) {
        return NextResponse.json(
          { error: "Source value is required" },
          { status: 400 },
        );
      }

      const result = await Lead.updateMany(baseQuery, { source: value });

      await logAudit(req, { actorType: "user", user }, {
        action: "patients.bulk.set_source",
        entityType: "Lead",
        summary: `Bulk re-tagged ${result.modifiedCount} leads to source "${value}"`,
        metadata: {
          requested: parsed.data.ids.length,
          modified: result.modifiedCount,
          source: value,
          ids: parsed.data.ids,
        },
      });

      return NextResponse.json({
        action: "set_source",
        requested: parsed.data.ids.length,
        modified: result.modifiedCount,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
