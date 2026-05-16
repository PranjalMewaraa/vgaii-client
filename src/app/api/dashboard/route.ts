import { prisma } from "@/lib/prisma";
import { getUser } from "@/middleware/auth";
import { withClientFilter } from "@/lib/query";
import { selfHealBusinessInfo } from "@/lib/business-info";
import { getErrorMessage } from "@/lib/errors";
import {
  checkExternalSubscription,
  toPrismaSubscriptionStatus,
} from "@/lib/subscription-check";
import {
  excludeDemoAppts,
  excludeDemoLeads,
} from "@/lib/onboarding/demo-filter";
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
            bookingUrl: true,
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

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    // 7-day window for the leads trend chart: includes today back six.
    const weekStart = new Date(startOfToday);
    weekStart.setDate(weekStart.getDate() - 6);
    const tomorrow = new Date(startOfToday);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      leadsCount,
      todayLeads,
      yesterdayLeads,
      patientsCount,
      appointments,
      yesterdayUpcomingAppointments,
      openFeedback,
      resolvedFeedback,
      ratedFeedbackAgg,
      sourcesAgg,
      weekLeadRows,
    ] = await Promise.all([
      prisma.lead.count({ where: { ...scope, ...excludeDemoLeads } }),
      prisma.lead.count({
        where: {
          ...scope,
          ...excludeDemoLeads,
          createdAt: { gte: startOfToday },
        },
      }),
      prisma.lead.count({
        where: {
          ...scope,
          ...excludeDemoLeads,
          createdAt: { gte: startOfYesterday, lt: startOfToday },
        },
      }),
      prisma.lead.count({
        where: {
          ...scope,
          ...excludeDemoLeads,
          status: { in: ["appointment_booked", "visited"] },
        },
      }),
      prisma.appointment.count({
        where: { ...scope, ...excludeDemoAppts, date: { gte: new Date() } },
      }),
      // Snapshot of "upcoming as of yesterday morning": appointments that
      // were already recorded before today began and still have a future
      // date. Subtracted from `appointments` to surface the day's delta on
      // the dashboard.
      prisma.appointment.count({
        where: {
          ...scope,
          ...excludeDemoAppts,
          date: { gte: startOfYesterday },
          createdAt: { lt: startOfToday },
        },
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
        where: { ...scope, ...excludeDemoLeads },
        _count: { _all: true },
        orderBy: { _count: { source: "desc" } },
        take: 8,
      }),
      // Last seven days of lead createdAt timestamps for the trend chart.
      // Bucketed in JS below since MySQL has no native date_trunc.
      prisma.lead.findMany({
        where: {
          ...scope,
          ...excludeDemoLeads,
          createdAt: { gte: weekStart, lt: tomorrow },
        },
        select: { createdAt: true },
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

    // Bucket the week's lead createdAt rows into a fixed 7-element trend
    // so empty days still render with zero on the chart.
    const dayKey = (d: Date) => {
      const x = new Date(d);
      x.setHours(0, 0, 0, 0);
      return x.toISOString().slice(0, 10);
    };
    const leadsByDay = new Map<string, number>();
    for (const r of weekLeadRows) {
      const k = dayKey(r.createdAt);
      leadsByDay.set(k, (leadsByDay.get(k) ?? 0) + 1);
    }
    const weeklyLeads: Array<{ date: string; count: number }> = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      const k = dayKey(d);
      weeklyLeads.push({ date: k, count: leadsByDay.get(k) ?? 0 });
    }

    return NextResponse.json({
      leadsCount,
      todayLeads,
      yesterdayLeads,
      patientsCount,
      appointments,
      yesterdayUpcomingAppointments,
      openFeedback,
      internalFeedback,
      subscription,
      renewalDate,
      subscriptionSource,
      subscriptionError,
      businessInfo,
      topSources,
      weeklyLeads,
      bookingUrl: client?.bookingUrl ?? null,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
