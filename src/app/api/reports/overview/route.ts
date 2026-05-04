import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { getUser } from "@/middleware/auth";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

// Stages in the lead funnel. "lost" is a terminal side-state, not a stage,
// so it's tracked separately. The order here is what produces the
// "passed-through" count: a lead currently at "qualified" has also passed
// through "new" and "contacted" (the state machine is forward-only).
const FUNNEL_STAGES = [
  "new",
  "contacted",
  "qualified",
  "appointment_booked",
  "visited",
] as const;

type FunnelStage = (typeof FUNNEL_STAGES)[number];

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const dayKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export async function GET(req: Request) {
  try {
    const user = getUser(req);

    if (user.role !== "CLIENT_ADMIN" && user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const fromParam = url.searchParams.get("from");
    const toParam = url.searchParams.get("to");

    // No defaults: when neither param is provided, the report covers all
    // time. Empty-window-on-first-load was confusing for clinics with
    // little data in the last 30 days.
    const now = new Date();
    const from = fromParam ? new Date(fromParam) : null;
    const to = toParam ? new Date(toParam) : null;
    if (
      (from && Number.isNaN(from.getTime())) ||
      (to && Number.isNaN(to.getTime()))
    ) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    // SUPER_ADMIN sees all clients (no filter); CLIENT_ADMIN scopes to
    // their own. Prisma string equality replaces the manual ObjectId cast
    // we needed in the Mongoose era.
    const tenantClause: Prisma.LeadWhereInput =
      user.role === "SUPER_ADMIN"
        ? {}
        : { clientId: user.clientId ?? "__never__" };

    const leadDateRange =
      from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {};

    const apptDateRange =
      from || to
        ? {
            date: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {};

    const leadWhere: Prisma.LeadWhereInput = { ...tenantClause, ...leadDateRange };
    const apptWhere: Prisma.AppointmentWhereInput = {
      ...(tenantClause as Prisma.AppointmentWhereInput),
      ...apptDateRange,
    };

    // Raw-SQL inputs: the tenant clause and date range expressed as inline
    // SQL fragments. Building them via `Prisma.sql` keeps the parameters
    // bound (no string interpolation in the final query).
    //
    // Backticks on every identifier because:
    //   - `Lead` is a MySQL 8 reserved word (the window function), so an
    //     unquoted `FROM Lead` parses as `FROM <window_function>` and
    //     throws ER_PARSE_ERROR.
    //   - On Linux MySQL (which Railway runs) identifiers are
    //     case-sensitive by default, and Prisma's migration emits camelCase
    //     column names exactly as written in schema.prisma.
    const leadTenantSql =
      user.role === "SUPER_ADMIN"
        ? Prisma.sql`1=1`
        : Prisma.sql`\`clientId\` = ${user.clientId ?? ""}`;
    const apptTenantSql = leadTenantSql; // same column name

    const leadDateSql =
      from && to
        ? Prisma.sql`\`createdAt\` BETWEEN ${from} AND ${to}`
        : from
          ? Prisma.sql`\`createdAt\` >= ${from}`
          : to
            ? Prisma.sql`\`createdAt\` <= ${to}`
            : Prisma.sql`1=1`;

    const apptDateSql =
      from && to
        ? Prisma.sql`\`date\` BETWEEN ${from} AND ${to}`
        : from
          ? Prisma.sql`\`date\` >= ${from}`
          : to
            ? Prisma.sql`\`date\` <= ${to}`
            : Prisma.sql`1=1`;

    // Pull the cached Google business info so we can also surface its
    // rating + (when available) per-star distribution alongside internal
    // outcome ratings. SUPER_ADMIN reports aggregate across every client,
    // so Google ratings only make sense for a single tenant.
    const googleInfoPromise: Promise<
      | {
          rating?: number;
          totalReviews?: number;
          ratingDistribution?: Record<"1" | "2" | "3" | "4" | "5", number>;
        }
      | null
    > =
      user.role === "CLIENT_ADMIN" && user.clientId
        ? prisma.client
            .findUnique({
              where: { id: user.clientId },
              select: { googleBusinessInfo: true },
            })
            .then(c => {
              const bi = (c?.googleBusinessInfo ?? null) as
                | {
                    rating?: number;
                    totalReviews?: number;
                    ratingDistribution?: Record<
                      "1" | "2" | "3" | "4" | "5",
                      number
                    >;
                  }
                | null;
              return bi;
            })
        : Promise.resolve(null);

    const [
      leadsByStatus,
      leadsBySource,
      ratingsByValue,
      apptByStatus,
      leadsTimeSeries,
      apptTimeSeries,
      googleInfo,
    ] = await Promise.all([
      prisma.lead.groupBy({
        by: ["status"],
        where: leadWhere,
        _count: { _all: true },
      }),
      // Conditional sums per source: Prisma's groupBy can't express
      // `SUM(CASE WHEN status='visited' THEN 1 ELSE 0 END)` directly, so
      // we drop to raw SQL. Returns BigInt counts in MySQL — coerced
      // to Number below.
      prisma.$queryRaw<
        Array<{
          source: string | null;
          total: bigint;
          visited: bigint;
          booked: bigint;
          lost: bigint;
        }>
      >`
        SELECT \`source\`,
               COUNT(*) AS total,
               SUM(CASE WHEN \`status\`='visited' THEN 1 ELSE 0 END) AS visited,
               SUM(CASE WHEN \`status\` IN ('appointment_booked','visited') THEN 1 ELSE 0 END) AS booked,
               SUM(CASE WHEN \`status\`='lost' THEN 1 ELSE 0 END) AS lost
        FROM \`Lead\`
        WHERE ${leadTenantSql} AND ${leadDateSql}
        GROUP BY \`source\`
        ORDER BY total DESC
      `,
      prisma.lead.groupBy({
        by: ["outcomeRating"],
        where: { ...leadWhere, outcomeRating: { gte: 1, lte: 5 } },
        _count: { _all: true },
      }),
      prisma.appointment.groupBy({
        by: ["status"],
        where: apptWhere,
        _count: { _all: true },
      }),
      prisma.$queryRaw<Array<{ day: string; count: bigint }>>`
        SELECT DATE_FORMAT(\`createdAt\`, '%Y-%m-%d') AS day,
               COUNT(*) AS count
        FROM \`Lead\`
        WHERE ${leadTenantSql} AND ${leadDateSql}
        GROUP BY day
        ORDER BY day
      `,
      prisma.$queryRaw<Array<{ day: string; count: bigint }>>`
        SELECT DATE_FORMAT(\`date\`, '%Y-%m-%d') AS day,
               COUNT(*) AS count
        FROM \`Appointment\`
        WHERE ${apptTenantSql} AND ${apptDateSql}
        GROUP BY day
        ORDER BY day
      `,
      googleInfoPromise,
    ]);

    const byStatus: Record<string, number> = {};
    for (const r of leadsByStatus) byStatus[r.status] = r._count._all;

    // Cumulative funnel: each stage = leads at that stage or later. Since
    // transitions are forward-only, current-status is sufficient signal for
    // "passed through this stage."
    const funnel: Record<FunnelStage, number> = {
      new: 0,
      contacted: 0,
      qualified: 0,
      appointment_booked: 0,
      visited: 0,
    };
    for (let i = 0; i < FUNNEL_STAGES.length; i++) {
      let count = 0;
      for (let j = i; j < FUNNEL_STAGES.length; j++) {
        count += byStatus[FUNNEL_STAGES[j]] ?? 0;
      }
      funnel[FUNNEL_STAGES[i]] = count;
    }
    const lostCount = byStatus.lost ?? 0;
    const totalLeads = funnel.new + lostCount;

    const sources = leadsBySource.map(s => {
      const total = Number(s.total);
      const visited = Number(s.visited);
      return {
        source: s.source ?? "unknown",
        total,
        booked: Number(s.booked),
        visited,
        lost: Number(s.lost),
        conversionRate: total > 0 ? visited / total : 0,
      };
    });

    const apptCounts = {
      total: 0,
      scheduled: 0,
      completed: 0,
      no_show: 0,
      cancelled: 0,
    };
    for (const r of apptByStatus) {
      const key = r.status as keyof typeof apptCounts;
      if (key in apptCounts) apptCounts[key] = r._count._all;
      apptCounts.total += r._count._all;
    }
    // No-show rate is computed against appointments that have a verdict
    // (completed + no_show). Pending "scheduled" appointments don't count
    // either way — they're still in flight.
    const verdictBase = apptCounts.completed + apptCounts.no_show;
    const noShowRate =
      verdictBase > 0 ? apptCounts.no_show / verdictBase : 0;

    const ratings: Record<1 | 2 | 3 | 4 | 5, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    let ratingTotal = 0;
    let ratingCount = 0;
    for (const r of ratingsByValue) {
      const v = r.outcomeRating;
      const c = r._count._all;
      if (v && v >= 1 && v <= 5) {
        ratings[v as 1 | 2 | 3 | 4 | 5] = c;
        ratingTotal += v * c;
        ratingCount += c;
      }
    }
    const avgRating = ratingCount > 0 ? ratingTotal / ratingCount : 0;

    // Build a continuous date axis so the chart shows zero-days too.
    const seriesByDay = new Map<string, { leads: number; appointments: number }>();
    for (const r of leadsTimeSeries) {
      seriesByDay.set(r.day, { leads: Number(r.count), appointments: 0 });
    }
    for (const r of apptTimeSeries) {
      const cur = seriesByDay.get(r.day) ?? { leads: 0, appointments: 0 };
      cur.appointments = Number(r.count);
      seriesByDay.set(r.day, cur);
    }

    // Time-series axis bounds: prefer the explicit picker range. When the
    // range is unbounded (all-time), use the actual data span — but cap
    // each side at 90 days from "now" so zero-fill doesn't render years
    // of empty bars when the clinic has only recent activity.
    const dataKeys = Array.from(seriesByDay.keys()).sort();
    const dataMin = dataKeys[0] ? new Date(dataKeys[0]) : null;
    const dataMax = dataKeys.length
      ? new Date(dataKeys[dataKeys.length - 1])
      : null;

    const ninetyAgo = new Date(now);
    ninetyAgo.setDate(ninetyAgo.getDate() - 90);

    const seriesFrom =
      from ?? (dataMin && dataMin > ninetyAgo ? dataMin : ninetyAgo);
    const seriesTo = to ?? dataMax ?? now;

    const timeSeries: Array<{ date: string; leads: number; appointments: number }> = [];
    const cursor = startOfDay(seriesFrom);
    const end = startOfDay(seriesTo);
    // Hard safety cap: never produce more than 366 bars regardless.
    let safety = 366;
    while (cursor <= end && safety-- > 0) {
      const key = dayKey(cursor);
      const v = seriesByDay.get(key) ?? { leads: 0, appointments: 0 };
      timeSeries.push({ date: key, leads: v.leads, appointments: v.appointments });
      cursor.setDate(cursor.getDate() + 1);
    }

    // Compose the Google ratings block. We only ship a histogram when
    // DataForSEO actually returned `rating_distribution`; otherwise the
    // UI shows just the aggregate (rating + total reviews) and a hint
    // that the breakdown isn't available.
    const googleDist = googleInfo?.ratingDistribution;
    const googleCount = googleDist
      ? Object.values(googleDist).reduce((s, v) => s + (v ?? 0), 0)
      : googleInfo?.totalReviews ?? 0;
    const googleRatings = googleInfo
      ? {
          rating: googleInfo.rating ?? null,
          totalReviews: googleInfo.totalReviews ?? null,
          // Histogram present only when distribution is non-empty.
          distribution: googleDist
            ? {
                1: googleDist["1"] ?? 0,
                2: googleDist["2"] ?? 0,
                3: googleDist["3"] ?? 0,
                4: googleDist["4"] ?? 0,
                5: googleDist["5"] ?? 0,
              }
            : null,
          count: googleCount,
        }
      : null;

    return NextResponse.json({
      range: {
        from: from ? from.toISOString() : null,
        to: to ? to.toISOString() : null,
      },
      funnel,
      lost: lostCount,
      totalLeads,
      sources,
      appointments: { ...apptCounts, noShowRate },
      ratings: {
        ...ratings,
        average: avgRating,
        count: ratingCount,
      },
      googleRatings,
      timeSeries,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
