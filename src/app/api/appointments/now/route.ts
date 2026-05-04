import { prisma } from "@/lib/prisma";
import { getUser } from "@/middleware/auth";
import { checkRole, checkModule } from "@/lib/rbac";
import { withClientFilter } from "@/lib/query";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

// "Active" = a scheduled appointment whose start time is within ±30 minutes
// of right now. Anything past that range is either a future appointment
// ("next") or already over and waiting to be marked visited.
const ACTIVE_WINDOW_MS = 30 * 60 * 1000;

export async function GET(req: Request) {
  try {
    const user = getUser(req);
    checkRole(user, ["CLIENT_ADMIN", "STAFF"]);
    checkModule(user, "appointments");

    const scope = withClientFilter(user) as { clientId?: string };
    const now = Date.now();

    const [active, next] = await Promise.all([
      prisma.appointment.findFirst({
        where: {
          ...scope,
          status: "scheduled",
          date: {
            gte: new Date(now - ACTIVE_WINDOW_MS),
            lte: new Date(now + ACTIVE_WINDOW_MS),
          },
        },
        orderBy: { date: "asc" },
      }),
      prisma.appointment.findFirst({
        where: {
          ...scope,
          status: "scheduled",
          date: { gt: new Date(now + ACTIVE_WINDOW_MS) },
        },
        orderBy: { date: "asc" },
      }),
    ]);

    return NextResponse.json({ active, next });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
