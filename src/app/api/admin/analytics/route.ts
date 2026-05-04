import { prisma } from "@/lib/prisma";
import { getUser } from "@/middleware/auth";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";

const DAY_MS = 24 * 60 * 60 * 1000;

// One round-trip instead of 18. MySQL parses every COUNT subquery as its
// own statement but reuses connection/parse overhead; remote-DB latency
// dominated the old fan-out.
type CountsRow = {
  totalClients: bigint;
  activeClients: bigint;
  trialClients: bigint;
  expiredClients: bigint;
  totalUsers: bigint;
  adminUsers: bigint;
  staffUsers: bigint;
  profilesEnabled: bigint;
  totalLeads: bigint;
  todayLeads: bigint;
  weekLeads: bigint;
  visitedLeads: bigint;
  lostLeads: bigint;
  upcomingAppointments: bigint;
  completedAppointments: bigint;
  openFeedback: bigint;
  resolvedFeedback: bigint;
};

export async function GET(req: Request) {
  try {
    const user = getUser(req);

    if (user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
    const startOfWeek = new Date(now.getTime() - 7 * DAY_MS);
    const in30Days = new Date(now.getTime() + 30 * DAY_MS);

    const [countsRows, attentionClients, topByLeadsRaw] = await Promise.all([
      prisma.$queryRaw<CountsRow[]>(Prisma.sql`
        SELECT
          (SELECT COUNT(*) FROM \`Client\`) AS totalClients,
          (SELECT COUNT(*) FROM \`Client\` WHERE \`subscriptionStatus\` = 'active') AS activeClients,
          (SELECT COUNT(*) FROM \`Client\` WHERE \`subscriptionStatus\` = 'trial') AS trialClients,
          (SELECT COUNT(*) FROM \`Client\` WHERE \`subscriptionStatus\` = 'expired') AS expiredClients,
          (SELECT COUNT(*) FROM \`User\` WHERE \`role\` IN ('CLIENT_ADMIN','STAFF')) AS totalUsers,
          (SELECT COUNT(*) FROM \`User\` WHERE \`role\` = 'CLIENT_ADMIN') AS adminUsers,
          (SELECT COUNT(*) FROM \`User\` WHERE \`role\` = 'STAFF') AS staffUsers,
          (SELECT COUNT(*) FROM \`Client\` WHERE JSON_EXTRACT(\`profile\`, '$.enabled') = TRUE) AS profilesEnabled,
          (SELECT COUNT(*) FROM \`Lead\`) AS totalLeads,
          (SELECT COUNT(*) FROM \`Lead\` WHERE \`createdAt\` >= ${startOfDay}) AS todayLeads,
          (SELECT COUNT(*) FROM \`Lead\` WHERE \`createdAt\` >= ${startOfWeek}) AS weekLeads,
          (SELECT COUNT(*) FROM \`Lead\` WHERE \`status\` = 'visited') AS visitedLeads,
          (SELECT COUNT(*) FROM \`Lead\` WHERE \`status\` = 'lost') AS lostLeads,
          (SELECT COUNT(*) FROM \`Appointment\` WHERE \`date\` >= ${now}) AS upcomingAppointments,
          (SELECT COUNT(*) FROM \`Appointment\` WHERE \`status\` = 'completed') AS completedAppointments,
          (SELECT COUNT(*) FROM \`Feedback\` WHERE \`status\` = 'open') AS openFeedback,
          (SELECT COUNT(*) FROM \`Feedback\` WHERE \`status\` = 'resolved') AS resolvedFeedback
      `),
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

    const c = countsRows[0];
    // BigInt → Number is safe for our row counts (we will not exceed 2^53).
    const n = (v: bigint) => Number(v);
    const totalClients = n(c.totalClients);
    const activeClients = n(c.activeClients);
    const trialClients = n(c.trialClients);
    const expiredClients = n(c.expiredClients);
    const totalUsers = n(c.totalUsers);
    const adminUsers = n(c.adminUsers);
    const staffUsers = n(c.staffUsers);
    const profilesEnabled = n(c.profilesEnabled);
    const totalLeads = n(c.totalLeads);
    const todayLeads = n(c.todayLeads);
    const weekLeads = n(c.weekLeads);
    const visitedLeads = n(c.visitedLeads);
    const lostLeads = n(c.lostLeads);
    const upcomingAppointments = n(c.upcomingAppointments);
    const completedAppointments = n(c.completedAppointments);
    const openFeedback = n(c.openFeedback);
    const resolvedFeedback = n(c.resolvedFeedback);
    const in7Days = new Date(now.getTime() + 7 * DAY_MS);

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
