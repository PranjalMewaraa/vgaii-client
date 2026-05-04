import { prisma } from "@/lib/prisma";
import { getUser } from "@/middleware/auth";
import { withClientFilter } from "@/lib/query";
import { selfHealBusinessInfo } from "@/lib/business-info";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const user = getUser(req);
    const scope = withClientFilter(user) as { clientId?: string };

    const client = user.clientId
      ? await prisma.client.findUnique({
          where: { id: user.clientId },
          select: {
            id: true,
            googlePlaceId: true,
            googleBusinessInfo: true,
            subscriptionStatus: true,
            renewalDate: true,
          },
        })
      : null;

    let businessInfo = client?.googleBusinessInfo ?? null;
    if (client?.googlePlaceId) {
      const fresh = await selfHealBusinessInfo({
        id: client.id,
        googlePlaceId: client.googlePlaceId,
        googleBusinessInfo: businessInfo as
          | { syncedAt?: Date | string | null }
          | null,
      });
      if (fresh) businessInfo = fresh;
    }

    const [
      leadsCount,
      todayLeads,
      patientsCount,
      appointments,
      openFeedback,
      resolvedFeedback,
      ratedFeedbackAgg,
    ] = await Promise.all([
      prisma.lead.count({ where: scope }),
      prisma.lead.count({
        where: {
          ...scope,
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      prisma.lead.count({
        where: { ...scope, status: { in: ["appointment_booked", "visited"] } },
      }),
      prisma.appointment.count({
        where: { ...scope, date: { gte: new Date() } },
      }),
      prisma.feedback.count({ where: { ...scope, status: "open" } }),
      prisma.feedback.count({ where: { ...scope, status: "resolved" } }),
      // Average rating + count are computed only over feedbacks that have a
      // numeric rating. Open issues without a rating skew the average if
      // included as zeros.
      prisma.feedback.aggregate({
        where: { ...scope, rating: { not: null } },
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);

    const internalFeedback = {
      total: openFeedback + resolvedFeedback,
      open: openFeedback,
      resolved: resolvedFeedback,
      ratedCount: ratedFeedbackAgg._count.rating ?? 0,
      avgRating: ratedFeedbackAgg._avg.rating ?? null,
    };

    return NextResponse.json({
      leadsCount,
      todayLeads,
      patientsCount,
      appointments,
      openFeedback,
      internalFeedback,
      subscription: client?.subscriptionStatus,
      renewalDate: client?.renewalDate,
      businessInfo,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
