import { connectDB } from "@/lib/db";
import Lead from "@/models/Lead";
import Appointment from "@/models/Appointment";
import { getUser } from "@/middleware/auth";
import { withClientFilter } from "@/lib/query";
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
    await connectDB();
    const user = getUser(req);

    if (user.role !== "CLIENT_ADMIN" && user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const fromParam = url.searchParams.get("from");
    const toParam = url.searchParams.get("to");

    // Default range: last 30 days.
    const now = new Date();
    const defaultFrom = new Date(now);
    defaultFrom.setDate(defaultFrom.getDate() - 30);

    const from = fromParam ? new Date(fromParam) : startOfDay(defaultFrom);
    const to = toParam ? new Date(toParam) : now;
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const baseFilter = withClientFilter(user);
    const dateRange = { $gte: from, $lte: to };

    const [
      leadsByStatus,
      leadsBySource,
      ratingsByValue,
      apptByStatus,
      leadsTimeSeries,
      apptTimeSeries,
    ] = await Promise.all([
      Lead.aggregate([
        { $match: { ...baseFilter, createdAt: dateRange } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Lead.aggregate([
        { $match: { ...baseFilter, createdAt: dateRange } },
        {
          $group: {
            _id: "$source",
            total: { $sum: 1 },
            visited: {
              $sum: { $cond: [{ $eq: ["$status", "visited"] }, 1, 0] },
            },
            booked: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      "$status",
                      ["appointment_booked", "visited"],
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            lost: {
              $sum: { $cond: [{ $eq: ["$status", "lost"] }, 1, 0] },
            },
          },
        },
        { $sort: { total: -1 } },
      ]),
      Lead.aggregate([
        {
          $match: {
            ...baseFilter,
            outcomeRating: { $gte: 1, $lte: 5 },
            createdAt: dateRange,
          },
        },
        { $group: { _id: "$outcomeRating", count: { $sum: 1 } } },
      ]),
      Appointment.aggregate([
        { $match: { ...baseFilter, date: dateRange } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Lead.aggregate([
        { $match: { ...baseFilter, createdAt: dateRange } },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Appointment.aggregate([
        { $match: { ...baseFilter, date: dateRange } },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$date" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const byStatus: Record<string, number> = {};
    for (const r of leadsByStatus) byStatus[r._id ?? "unknown"] = r.count;

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

    const sources = leadsBySource.map(s => ({
      source: s._id ?? "unknown",
      total: s.total,
      booked: s.booked,
      visited: s.visited,
      lost: s.lost,
      conversionRate: s.total > 0 ? s.visited / s.total : 0,
    }));

    const apptCounts = {
      total: 0,
      scheduled: 0,
      completed: 0,
      no_show: 0,
      cancelled: 0,
    };
    for (const r of apptByStatus) {
      const key = (r._id ?? "scheduled") as keyof typeof apptCounts;
      if (key in apptCounts) apptCounts[key] = r.count;
      apptCounts.total += r.count;
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
      const v = r._id as 1 | 2 | 3 | 4 | 5;
      if (v >= 1 && v <= 5) {
        ratings[v] = r.count;
        ratingTotal += v * r.count;
        ratingCount += r.count;
      }
    }
    const avgRating = ratingCount > 0 ? ratingTotal / ratingCount : 0;

    // Build a continuous date axis so the chart shows zero-days too.
    const seriesByDay = new Map<string, { leads: number; appointments: number }>();
    for (const r of leadsTimeSeries) {
      seriesByDay.set(r._id, { leads: r.count, appointments: 0 });
    }
    for (const r of apptTimeSeries) {
      const cur = seriesByDay.get(r._id) ?? { leads: 0, appointments: 0 };
      cur.appointments = r.count;
      seriesByDay.set(r._id, cur);
    }

    const timeSeries: Array<{ date: string; leads: number; appointments: number }> = [];
    const cursor = startOfDay(from);
    const end = startOfDay(to);
    while (cursor <= end) {
      const key = dayKey(cursor);
      const v = seriesByDay.get(key) ?? { leads: 0, appointments: 0 };
      timeSeries.push({ date: key, leads: v.leads, appointments: v.appointments });
      cursor.setDate(cursor.getDate() + 1);
    }

    return NextResponse.json({
      range: { from: from.toISOString(), to: to.toISOString() },
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
      timeSeries,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
