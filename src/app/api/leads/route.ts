import { connectDB } from "@/lib/db";
import Lead from "@/models/Lead";
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
    await connectDB();

    const user = getUser(req);
    checkRole(user, ["CLIENT_ADMIN", "STAFF"]);
    checkModule(user, "leads");

    const body = await req.json();
    const parsed = leadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const lead = await Lead.create({
      ...parsed.data,
      clientId: user.clientId,
      createdBy: user.id,
      feedbackToken: generateFeedbackToken(),
    });

    await logAudit(req, { actorType: "user", user }, {
      action: "lead.created",
      entityType: "Lead",
      entityId: lead._id.toString(),
      entityLabel: lead.name,
      summary: `Lead created${lead.source ? ` from ${lead.source}` : ""}`,
      metadata: { phone: lead.phone, source: lead.source },
    });

    const origin = req.headers.get("origin") ?? new URL(req.url).origin;

    return NextResponse.json({
      lead,
      feedbackUrl: buildFeedbackUrl(origin, lead.feedbackToken),
    });

  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    await connectDB();

    const user = getUser(req);
    checkRole(user, ["CLIENT_ADMIN", "STAFF"]);
    checkModule(user, "leads");

    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const source = url.searchParams.get("source");
    const search = url.searchParams.get("search")?.trim();
    const includeAll = url.searchParams.get("all") === "1";

    const filter: Record<string, unknown> = withClientFilter(user);
    if (status) {
      filter.status = status;
    } else if (!includeAll) {
      // By default exclude qualified+ since those records live in /patients.
      filter.status = {
        $nin: ["qualified", "appointment_booked", "visited"],
      };
    }
    if (source) filter.source = source;
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(escaped, "i");
      filter.$or = [{ name: re }, { phone: re }];
    }

    const leads = await Lead.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return NextResponse.json({ leads });

  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
