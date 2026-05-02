import { connectDB } from "@/lib/db";
import AuditLog from "@/models/AuditLog";
import { getUser } from "@/middleware/auth";
import { withClientFilter } from "@/lib/query";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

const PAGE_SIZE = 50;
const MAX_LIMIT = 200;

export async function GET(req: Request) {
  try {
    await connectDB();
    const user = getUser(req);

    // Audit log is admin-only. Staff don't see other people's actions.
    if (user.role !== "CLIENT_ADMIN" && user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const entityType = url.searchParams.get("entityType");
    const entityId = url.searchParams.get("entityId");
    const action = url.searchParams.get("action");
    const actorType = url.searchParams.get("actorType");
    const fromParam = url.searchParams.get("from");
    const toParam = url.searchParams.get("to");
    const cursor = url.searchParams.get("cursor"); // ISO date for createdAt < cursor
    const limit = Math.min(
      Number(url.searchParams.get("limit")) || PAGE_SIZE,
      MAX_LIMIT,
    );

    const filter: Record<string, unknown> = withClientFilter(user);
    if (entityType) filter.entityType = entityType;
    if (entityId) filter.entityId = entityId;
    if (action) filter.action = action;
    if (actorType) filter.actorType = actorType;

    if (fromParam || toParam || cursor) {
      const dateFilter: Record<string, Date> = {};
      if (fromParam && !Number.isNaN(Date.parse(fromParam))) {
        dateFilter.$gte = new Date(fromParam);
      }
      if (toParam && !Number.isNaN(Date.parse(toParam))) {
        dateFilter.$lte = new Date(toParam);
      }
      if (cursor && !Number.isNaN(Date.parse(cursor))) {
        dateFilter.$lt = new Date(cursor);
      }
      if (Object.keys(dateFilter).length > 0) filter.createdAt = dateFilter;
    }

    const entries = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .lean();

    const hasMore = entries.length > limit;
    const page = entries.slice(0, limit);
    const nextCursor = hasMore
      ? new Date(page[page.length - 1].createdAt).toISOString()
      : null;

    return NextResponse.json({ entries: page, nextCursor });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
