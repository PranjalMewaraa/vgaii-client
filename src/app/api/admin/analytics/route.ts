import { prisma } from "@/lib/prisma";
import { getUser } from "@/middleware/auth";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";
export async function GET(req: Request) {
  try {
    const user = getUser(req);

    if (user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
    const startOfWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

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
    ] = await Promise.all([
      prisma.client.count(),
      prisma.client.count({ where: { subscriptionStatus: "active" } }),
      prisma.client.count({ where: { subscriptionStatus: "trial" } }),
      prisma.client.count({ where: { subscriptionStatus: "expired" } }),
      prisma.user.count({ where: { role: { in: ["CLIENT_ADMIN", "STAFF"] } } }),
      prisma.user.count({ where: { role: "CLIENT_ADMIN" } }),
      prisma.user.count({ where: { role: "STAFF" } }),
      // JSON path filter: counts clients where profile.enabled === true.
      prisma.client.count({
        where: { profile: { path: "$.enabled", equals: true } },
      }),
      prisma.lead.count(),
      prisma.lead.count({ where: { createdAt: { gte: startOfDay } } }),
      prisma.lead.count({ where: { createdAt: { gte: startOfWeek } } }),
      prisma.lead.count({ where: { status: "visited" } }),
      prisma.lead.count({ where: { status: "lost" } }),
      prisma.appointment.count({ where: { date: { gte: new Date() } } }),
      prisma.appointment.count({ where: { status: "completed" } }),
      prisma.feedback.count({ where: { status: "open" } }),
      prisma.feedback.count({ where: { status: "resolved" } }),
    ]);

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
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
