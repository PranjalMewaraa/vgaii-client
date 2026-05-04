import { prisma } from "@/lib/prisma";
import { getUser } from "@/middleware/auth";
import { withClientFilter } from "@/lib/query";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

const PAGE_SIZE = 50;
const MAX_LIMIT = 200;

export async function GET(req: Request) {
  try {
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

    // `withClientFilter` returns `{ clientId }` for non-admins and `{}`
    // for SUPER_ADMIN — same shape works as a Prisma `where`.
    const where: Record<string, unknown> = withClientFilter(user);
    if (entityType) {
      where.entityType =
        entityType as "Lead" | "Appointment" | "Client" | "User" | "Feedback";
    }
    if (entityId) where.entityId = entityId;
    if (action) where.action = action;
    if (actorType) {
      where.actorType =
        actorType as "user" | "webhook" | "public" | "system";
    }

    if (fromParam || toParam || cursor) {
      const dateFilter: Record<string, Date> = {};
      if (fromParam && !Number.isNaN(Date.parse(fromParam))) {
        dateFilter.gte = new Date(fromParam);
      }
      if (toParam && !Number.isNaN(Date.parse(toParam))) {
        dateFilter.lte = new Date(toParam);
      }
      if (cursor && !Number.isNaN(Date.parse(cursor))) {
        dateFilter.lt = new Date(cursor);
      }
      if (Object.keys(dateFilter).length > 0) where.createdAt = dateFilter;
    }

    const entries = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
    });

    const hasMore = entries.length > limit;
    const page = entries.slice(0, limit);
    const nextCursor = hasMore
      ? page[page.length - 1].createdAt.toISOString()
      : null;

    return NextResponse.json({ entries: page, nextCursor });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
