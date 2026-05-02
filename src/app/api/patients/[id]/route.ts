import { connectDB } from "@/lib/db";
import Lead from "@/models/Lead";
import Appointment from "@/models/Appointment";
import Feedback from "@/models/Feedback";
import Client from "@/models/Client";
import { getUser } from "@/middleware/auth";
import { withClientFilter } from "@/lib/query";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: RouteContext) {
  try {
    await connectDB();
    const user = getUser(req);
    const { id } = await ctx.params;
    const filter = withClientFilter(user);

    const lead = await Lead.findOne({ ...filter, _id: id }).lean();

    if (lead) {
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
              .lean<{ bookingUrl?: string }>()
          : null,
      ]);

      return NextResponse.json({
        kind: "lead",
        lead,
        appointments,
        feedbacks,
        bookingUrl: client?.bookingUrl ?? null,
      });
    }

    const appt = await Appointment.findOne({
      ...filter,
      _id: id,
      leadId: { $in: [null, undefined] },
    }).lean();

    if (!appt) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    return NextResponse.json({
      kind: "direct",
      appointment: appt,
    });

  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
