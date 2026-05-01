import { connectDB } from "@/lib/db";
import Lead from "@/models/Lead";
import Appointment from "@/models/Appointment";
import Feedback from "@/models/Feedback";
import Client from "@/models/Client";
import { getUser } from "@/middleware/auth";
import { withClientFilter } from "@/lib/query";
import { selfHealBusinessInfo } from "@/lib/business-info";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    await connectDB();

    const user = getUser(req);
    const filter = withClientFilter(user);

    const client = user.clientId
      ? await Client.findById(user.clientId)
      : null;

    if (client?.googlePlaceId) {
      await selfHealBusinessInfo(client);
    }

    const [
      leadsCount,
      todayLeads,
      patientsCount,
      appointments,
      openFeedback,
    ] = await Promise.all([
      Lead.countDocuments(filter),
      Lead.countDocuments({
        ...filter,
        createdAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      }),
      Lead.countDocuments({
        ...filter,
        status: { $in: ["appointment_booked", "visited"] },
      }),
      Appointment.countDocuments({
        ...filter,
        date: { $gte: new Date() },
      }),
      Feedback.countDocuments({ ...filter, status: "open" }),
    ]);

    return NextResponse.json({
      leadsCount,
      todayLeads,
      patientsCount,
      appointments,
      openFeedback,
      subscription: client?.subscriptionStatus,
      renewalDate: client?.renewalDate,
      businessInfo: client?.googleBusinessInfo ?? null,
    });

  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
