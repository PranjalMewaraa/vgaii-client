import { prisma } from "@/lib/prisma";
import { getUser } from "@/middleware/auth";
import { checkRole, checkModule } from "@/lib/rbac";
import { withClientFilter } from "@/lib/query";
import { excludeDemoPayments } from "@/lib/onboarding/demo-filter";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

// Daily summary cards on the Finances tab. The caller can request a
// specific day with ?date=YYYY-MM-DD, otherwise today is used.

type Bucket = { method: string; total: number; count: number };

const dayBounds = (raw: string | null) => {
  let start = new Date();
  if (raw && !Number.isNaN(Date.parse(raw))) {
    start = new Date(raw);
  }
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
};

export async function GET(req: Request) {
  try {
    const user = getUser(req);
    checkRole(user, ["CLIENT_ADMIN", "STAFF"]);
    checkModule(user, "payments");

    const url = new URL(req.url);
    const { start, end } = dayBounds(url.searchParams.get("date"));

    const scope = withClientFilter(user) as { clientId?: string };
    const range = { gte: start, lt: end };

    // Seven-day window for the trend chart: includes the requested day
    // back six days. We bucket in JS rather than asking MySQL for date
    // truncation — the dataset for a single tenant's last week is small
    // enough that it's not worth a $queryRaw.
    const trendStart = new Date(start);
    trendStart.setDate(trendStart.getDate() - 6);

    // groupBy returns one row per (paymentMethod) bucket. We sum finalAmount
    // (post-discount) so the totals reflect what actually changed hands.
    const [paymentBuckets, expenseTotal, expenseBuckets, pendingTotal, trendPayments, trendExpenses] =
      await Promise.all([
        prisma.payment.groupBy({
          by: ["paymentMethod"],
          where: { ...scope, ...excludeDemoPayments, createdAt: range },
          _sum: { finalAmount: true },
          _count: { _all: true },
        }),
        prisma.expense.aggregate({
          where: { ...scope, createdAt: range },
          _sum: { amount: true },
          _count: { _all: true },
        }),
        prisma.expense.groupBy({
          by: ["category"],
          where: { ...scope, createdAt: range },
          _sum: { amount: true },
          _count: { _all: true },
        }),
        // "Pending" payments are tracked separately — they don't roll into
        // cash/upi/card buckets because no money has actually arrived yet.
        prisma.payment.aggregate({
          where: {
            ...scope,
            ...excludeDemoPayments,
            createdAt: range,
            paymentMethod: "pending",
          },
          _sum: { finalAmount: true },
          _count: { _all: true },
        }),
        // Trend rows for the 7-day window. We pull the bare minimum
        // columns and bucket in memory.
        prisma.payment.findMany({
          where: {
            ...scope,
            ...excludeDemoPayments,
            createdAt: { gte: trendStart, lt: end },
          },
          select: { createdAt: true, finalAmount: true, paymentMethod: true },
        }),
        prisma.expense.findMany({
          where: { ...scope, createdAt: { gte: trendStart, lt: end } },
          select: { createdAt: true, amount: true },
        }),
      ]);

    const byMethod: Record<string, Bucket> = {};
    let collectedTotal = 0;
    for (const b of paymentBuckets) {
      const total = b._sum.finalAmount ?? 0;
      byMethod[b.paymentMethod] = {
        method: b.paymentMethod,
        total,
        count: b._count._all,
      };
      // Pending payments are not "collected" — exclude from the headline.
      if (b.paymentMethod !== "pending") collectedTotal += total;
    }

    const expenses = {
      total: expenseTotal._sum.amount ?? 0,
      count: expenseTotal._count._all,
      byCategory: expenseBuckets.map(b => ({
        category: b.category,
        total: b._sum.amount ?? 0,
        count: b._count._all,
      })),
    };

    // Stitch the 7-day trend. Iterate days first so empty days still
    // appear in the chart with zero totals.
    const dayKey = (d: Date) => {
      const x = new Date(d);
      x.setHours(0, 0, 0, 0);
      return x.toISOString().slice(0, 10);
    };
    const collectedByDay = new Map<string, number>();
    const expensesByDay = new Map<string, number>();
    for (const p of trendPayments) {
      // Pending payments don't represent cash in hand — skip them in the
      // trend for consistency with the headline "collected" tile.
      if (p.paymentMethod === "pending") continue;
      const k = dayKey(p.createdAt);
      collectedByDay.set(k, (collectedByDay.get(k) ?? 0) + p.finalAmount);
    }
    for (const e of trendExpenses) {
      const k = dayKey(e.createdAt);
      expensesByDay.set(k, (expensesByDay.get(k) ?? 0) + e.amount);
    }
    const weeklyTrend: Array<{
      date: string;
      collected: number;
      expenses: number;
    }> = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(trendStart);
      d.setDate(d.getDate() + i);
      const k = dayKey(d);
      weeklyTrend.push({
        date: k,
        collected: collectedByDay.get(k) ?? 0,
        expenses: expensesByDay.get(k) ?? 0,
      });
    }

    return NextResponse.json({
      date: start.toISOString(),
      collectedTotal,
      byMethod,
      pending: {
        total: pendingTotal._sum.finalAmount ?? 0,
        count: pendingTotal._count._all,
      },
      expenses,
      net: collectedTotal - expenses.total,
      weeklyTrend,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
