import { connectDB } from "@/lib/db";
import Lead from "@/models/Lead";
import Appointment from "@/models/Appointment";
import Review from "@/models/Review";
import Feedback from "@/models/Feedback";
import Client from "@/models/Client";
import { getUser } from "@/middleware/auth";
import { withClientFilter } from "@/lib/query";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    await connectDB();

    const user = getUser(req);

    const filter = withClientFilter(user);

    const [
      leadsCount,
      todayLeads,
      appointments,
      positiveReviews,
      negativeReviews,
      openFeedback,
      client,
    ] = await Promise.all([
      Lead.countDocuments(filter),

      Lead.countDocuments({
        ...filter,
        createdAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      }),

      Appointment.countDocuments({
        ...filter,
        date: { $gte: new Date() },
      }),

      Review.countDocuments({
        ...filter,
        sentiment: "positive",
      }),

      Review.countDocuments({
        ...filter,
        sentiment: "negative",
      }),

      Feedback.countDocuments({
        ...filter,
        status: "open",
      }),

      Client.findById(user.clientId),
    ]);

    return NextResponse.json({
      leadsCount,
      todayLeads,
      appointments,
      positiveReviews,
      negativeReviews,
      openFeedback,
      subscription: client?.subscriptionStatus,
      renewalDate: client?.renewalDate,
    });

  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
