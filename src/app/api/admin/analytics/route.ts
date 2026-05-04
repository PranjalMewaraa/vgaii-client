import { prisma } from "@/lib/prisma";
import { getUser } from "@/middleware/auth";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function GET(req: Request) {
  try {
    const user = getUser(req);

    if (user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
    const startOfWeek = new Date(now.getTime() - 7 * DAY_MS);
    const in7Days = new Date(now.getTime() + 7 * DAY_MS);
    const in30Days = new Date(now.getTime() + 30 * DAY_MS);

    const [
      totalClients,
      activeClients,
      trialClients,
      expiredClients,
      totalUsers,
      adminUsers,
      staffUsers,
      profilesEnabled,
      totalLeads,
      todayLeads,
      weekLeads,
      visitedLeads,
      lostLeads,
      upcomingAppointments,
      completedAppointments,
      openFeedback,
      resolvedFeedback,
      // Subscription attention queue. Sort: expired first, then expiring
      // soonest. Limited to 10 since we only render a callout, not a
      // paginated list.
      attentionClients,
      // Top clients this week by lead volume — single query, then we
      // hydrate names below.
      topByLeadsRaw,
    ] = await Promise.all([
      prisma.client.count(),
      prisma.client.count({ where: { subscriptionStatus: "active" } }),
      prisma.client.count({ where: { subscriptionStatus: "trial" } }),
      prisma.client.count({ where: { subscriptionStatus: "expired" } }),
      prisma.user.count({ where: { role: { in: ["CLIENT_ADMIN", "STAFF"] } } }),
      prisma.user.count({ where: { role: "CLIENT_ADMIN" } }),
      prisma.user.count({ where: { role: "STAFF" } }),
      prisma.client.count({
        where: { profile: { path: "$.enabled", equals: true } },
      }),
      prisma.lead.count(),
      prisma.lead.count({ where: { createdAt: { gte: startOfDay } } }),
      prisma.lead.count({ where: { createdAt: { gte: startOfWeek } } }),
      prisma.lead.count({ where: { status: "visited" } }),
      prisma.lead.count({ where: { status: "lost" } }),
      prisma.appointment.count({ where: { date: { gte: now } } }),
      prisma.appointment.count({ where: { status: "completed" } }),
      prisma.feedback.count({ where: { status: "open" } }),
      prisma.feedback.count({ where: { status: "resolved" } }),
      prisma.client.findMany({
        where: {
          OR: [
            { subscriptionStatus: "expired" },
            {
              subscriptionStatus: { in: ["trial", "active"] },
              // `lte` on a nullable column already excludes nulls, which is
              // the behaviour we want — clients without a renewal date set
              // can't be flagged as expiring.
              renewalDate: { lte: in30Days },
            },
          ],
        },
        select: {
          id: true,
          name: true,
          subscriptionStatus: true,
          renewalDate: true,
        },
        // Earliest renewal first; we re-sort by severity in app code so
        // expired clients always rise to the top.
        orderBy: { renewalDate: "asc" },
        take: 10,
      }),
      prisma.lead.groupBy({
        by: ["clientId"],
        where: { createdAt: { gte: startOfWeek } },
        _count: { _all: true },
        orderBy: { _count: { id: "desc" } },
        take: 5,
      }),
    ]);

    // Categorise the attention queue so the UI can colour them.
    type AttentionRow = {
      id: string;
      name: string;
      subscriptionStatus: string;
      renewalDate: Date | null;
      severity: "expired" | "this_week" | "this_month";
      daysUntilRenewal: number | null;
    };
    const SEVERITY_ORDER: Record<AttentionRow["severity"], number> = {
      expired: 0,
      this_week: 1,
      this_month: 2,
    };
    const subscriptionAttention: AttentionRow[] = attentionClients
      .map(c => {
        const due = c.renewalDate?.getTime();
        const daysUntilRenewal =
          due != null ? Math.round((due - now.getTime()) / DAY_MS) : null;
        let severity: AttentionRow["severity"];
        if (c.subscriptionStatus === "expired") severity = "expired";
        else if (due != null && due <= in7Days.getTime()) severity = "this_week";
        else severity = "this_month";
        return {
          id: c.id,
          name: c.name,
          subscriptionStatus: c.subscriptionStatus,
          renewalDate: c.renewalDate,
          severity,
          daysUntilRenewal,
        };
      })
      .sort(
        (a, b) =>
          SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
          (a.daysUntilRenewal ?? Infinity) - (b.daysUntilRenewal ?? Infinity),
      );

    // Hydrate client names for the top-clients list. Two queries because
    // groupBy doesn't compose with `include`.
    const topClientIds = topByLeadsRaw
      .map(r => r.clientId)
      .filter((id): id is string => !!id);
    const topClientNames = topClientIds.length
      ? await prisma.client.findMany({
          where: { id: { in: topClientIds } },
          select: { id: true, name: true },
        })
      : [];
    const nameById = new Map(topClientNames.map(c => [c.id, c.name]));
    const topClientsThisWeek = topByLeadsRaw
      .filter(r => r.clientId && nameById.has(r.clientId))
      .map(r => ({
        clientId: r.clientId!,
        clientName: nameById.get(r.clientId!) ?? "—",
        leads: r._count._all,
      }));

    return NextResponse.json({
      clients: {
        total: totalClients,
        active: activeClients,
        trial: trialClients,
        expired: expiredClients,
        profilesEnabled,
      },
      users: {
        total: totalUsers,
        admins: adminUsers,
        staff: staffUsers,
      },
      leads: {
        total: totalLeads,
        today: todayLeads,
        thisWeek: weekLeads,
        visited: visitedLeads,
        lost: lostLeads,
      },
      appointments: {
        upcoming: upcomingAppointments,
        completed: completedAppointments,
      },
      feedback: {
        open: openFeedback,
        resolved: resolvedFeedback,
      },
      subscriptionAttention,
      topClientsThisWeek,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
