import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { createLead } from "@/repos/lead";
import { getUser } from "@/middleware/auth";
import { checkRole, checkModule } from "@/lib/rbac";
import { withClientFilter } from "@/lib/query";
import { leadSchema } from "@/lib/validators/lead";
import { generateFeedbackToken, buildFeedbackUrl } from "@/lib/feedback-token";
import { getErrorMessage } from "@/lib/errors";
import { logAudit } from "@/lib/audit";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const user = getUser(req);
    checkRole(user, ["CLIENT_ADMIN", "STAFF"]);
    checkModule(user, "leads");

    const body = await req.json();
    const parsed = leadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    if (!user.clientId) {
      return NextResponse.json({ error: "No client context" }, { status: 400 });
    }

    const lead = await createLead({
      ...parsed.data,
      // notes is required NOT NULL with no default in MySQL; the schema
      // doesn't accept a notes input on this endpoint, so default to "".
      notes: "",
      clientId: user.clientId,
      createdById: user.id,
      feedbackToken: generateFeedbackToken(),
    });

    await logAudit(req, { actorType: "user", user }, {
      action: "lead.created",
      entityType: "Lead",
      entityId: lead.id,
      entityLabel: lead.name,
      summary: `Lead created${lead.source ? ` from ${lead.source}` : ""}`,
      metadata: { phone: lead.phone, source: lead.source },
    });

    const origin = req.headers.get("origin") ?? new URL(req.url).origin;

    return NextResponse.json({
      lead,
      feedbackUrl: lead.feedbackToken
        ? buildFeedbackUrl(origin, lead.feedbackToken)
        : null,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const user = getUser(req);
    checkRole(user, ["CLIENT_ADMIN", "STAFF"]);
    checkModule(user, "leads");

    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const source = url.searchParams.get("source");
    const search = url.searchParams.get("search")?.trim();
    const includeAll = url.searchParams.get("all") === "1";

    const where: Prisma.LeadWhereInput = withClientFilter(user) as Prisma.LeadWhereInput;
    if (status) {
      where.status = status as Prisma.LeadWhereInput["status"];
    } else if (!includeAll) {
      // By default exclude qualified+ since those records live in /patients.
      where.status = {
        notIn: ["qualified", "appointment_booked", "visited"],
      };
    }
    if (source) where.source = source;
    if (search) {
      // Prisma's `contains` performs a LIKE %search%. MySQL's default
      // collation is case-insensitive (utf8mb4_unicode_ci), so we don't
      // need an explicit `mode: "insensitive"` like Postgres.
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const leads = await prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ leads });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
