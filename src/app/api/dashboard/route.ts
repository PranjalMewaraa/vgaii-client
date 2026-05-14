import { prisma } from "@/lib/prisma";
import { getUser } from "@/middleware/auth";
import { withClientFilter } from "@/lib/query";
import { selfHealBusinessInfo } from "@/lib/business-info";
import { getErrorMessage } from "@/lib/errors";
import {
  checkExternalSubscription,
  toPrismaSubscriptionStatus,
} from "@/lib/subscription-check";
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
            subscriptionKey: true,
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

    let subscription = client?.subscriptionStatus;
    let renewalDate = client?.renewalDate ?? null;
    let subscriptionSource: "external" | "local" = "local";
    let subscriptionError: string | undefined;

    if (client?.subscriptionKey) {
      const checked = await checkExternalSubscription(client.subscriptionKey);
      if (checked.ok) {
        subscription = checked.status;
        subscriptionSource = "external";
        if (checked.renewalDate !== undefined) {
          renewalDate = checked.renewalDate;
        }

        if (
          checked.status !== client.subscriptionStatus ||
          (checked.renewalDate !== undefined &&
            (checked.renewalDate?.getTime() ?? null) !==
              (client.renewalDate?.getTime() ?? null))
        ) {
          await prisma.client.update({
            where: { id: client.id },
            data: {
              subscriptionStatus: toPrismaSubscriptionStatus(checked.status),
              ...(checked.renewalDate !== undefined
                ? { renewalDate: checked.renewalDate }
                : {}),
            },
          });
        }
      } else {
        subscriptionError = checked.error;
      }
    }

    const [
      leadsCount,
      todayLeads,
      patientsCount,
      appointments,
      openFeedback,
      resolvedFeedback,
      ratedFeedbackAgg,
      sourcesAgg,
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
      // Top sources for the "Where your leads are coming from" widget.
      // Keep the top 4 buckets; anything else is rolled into "Other" client-side.
      prisma.lead.groupBy({
        by: ["source"],
        where: scope,
        _count: { _all: true },
        orderBy: { _count: { source: "desc" } },
        take: 8,
      }),
    ]);

    const internalFeedback = {
      total: openFeedback + resolvedFeedback,
      open: openFeedback,
      resolved: resolvedFeedback,
      ratedCount: ratedFeedbackAgg._count.rating ?? 0,
      avgRating: ratedFeedbackAgg._avg.rating ?? null,
    };

    const topSources = sourcesAgg.map(s => ({
      source: s.source ?? "Unknown",
      count: s._count._all,
    }));

    return NextResponse.json({
      leadsCount,
      todayLeads,
      patientsCount,
      appointments,
      openFeedback,
      internalFeedback,
      subscription,
      renewalDate,
      subscriptionSource,
      subscriptionError,
      businessInfo,
      topSources,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
