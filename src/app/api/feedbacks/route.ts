import { prisma } from "@/lib/prisma";
import { getUser } from "@/middleware/auth";
import { checkRole, checkModule } from "@/lib/rbac";
import { withClientFilter } from "@/lib/query";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const user = getUser(req);
    checkRole(user, ["CLIENT_ADMIN", "STAFF"]);
    checkModule(user, "feedback");

    const scope = withClientFilter(user) as { clientId?: string };

    // Single query with `include` does the lead-join Mongoose needed two
    // round-trips for. Selecting only the lead fields the UI displays.
    const feedbacks = await prisma.feedback.findMany({
      where: scope,
      orderBy: { createdAt: "desc" },
      include: {
        lead: { select: { id: true, name: true, phone: true, status: true } },
      },
    });

    return NextResponse.json({ feedbacks });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
