import { connectDB } from "@/lib/db";
import Lead from "@/models/Lead";
import Appointment from "@/models/Appointment";
import Feedback from "@/models/Feedback";
import Client from "@/models/Client";
import { getUser } from "@/middleware/auth";
import { checkRole, checkModule } from "@/lib/rbac";
import { withClientFilter } from "@/lib/query";
import { leadUpdateSchema } from "@/lib/validators/lead";
import { canTransition, type LeadStatus } from "@/lib/constants";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: RouteContext) {
  try {
    await connectDB();
    const user = getUser(req);
    checkRole(user, ["CLIENT_ADMIN", "STAFF"]);
    checkModule(user, "leads");

    const { id } = await ctx.params;
    const filter = withClientFilter(user);

    const lead = await Lead.findOne({ ...filter, _id: id }).lean();
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const [appointments, feedbacks, client] = await Promise.all([
      Appointment.find({ ...filter, leadId: lead._id })
        .sort({ date: -1 })
        .lean(),
      Feedback.find({ ...filter, leadId: lead._id })
        .sort({ createdAt: -1 })
        .lean(),
      user.clientId
        ? Client.findById(user.clientId)
            .select("bookingUrl")
            .lean()
        : null,
    ]);

    return NextResponse.json({
      lead,
      appointments,
      feedbacks,
      bookingUrl:
        (client && "bookingUrl" in client
          ? client.bookingUrl
          : null) ?? null,
    });

  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: RouteContext) {
  try {
    await connectDB();
    const user = getUser(req);
    checkRole(user, ["CLIENT_ADMIN", "STAFF"]);
    checkModule(user, "leads");

    const { id } = await ctx.params;
    const filter = withClientFilter(user);

    const body = await req.json();
    const parsed = leadUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const lead = await Lead.findOne({ ...filter, _id: id });
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    if (parsed.data.status !== undefined) {
      const from = (lead.status as LeadStatus) ?? "new";
      const to = parsed.data.status;
      if (!canTransition(from, to)) {
        return NextResponse.json(
          {
            error: `Status cannot move from "${from}" to "${to}". Allowed next steps follow the lead workflow.`,
          },
          { status: 400 },
        );
      }
      lead.status = to;
      lead.statusUpdatedAt = new Date();
    }
    if (parsed.data.notes !== undefined) lead.notes = parsed.data.notes;
    if (parsed.data.outcomeRating !== undefined) {
      lead.outcomeRating = parsed.data.outcomeRating;
    }

    await lead.save();

    return NextResponse.json({ lead });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
