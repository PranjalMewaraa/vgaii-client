import { prisma } from "@/lib/prisma";
import { getUser } from "@/middleware/auth";
import { checkRole } from "@/lib/rbac";
import { DEFAULT_EXPENSE_PRESETS } from "@/lib/payment-defaults";
import { logAudit } from "@/lib/audit";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

// One-click populate of starter expense presets. Refuses to run if the
// tenant already has any — keeps the action idempotent and safe for
// accidental double-clicks.
export async function POST(req: Request) {
  try {
    const user = getUser(req);
    checkRole(user, ["CLIENT_ADMIN"]);
    if (!user.clientId) {
      return NextResponse.json({ error: "No client context" }, { status: 400 });
    }

    const existing = await prisma.expensePreset.count({
      where: { clientId: user.clientId },
    });
    if (existing > 0) {
      return NextResponse.json(
        { error: "Expense presets already exist for this client" },
        { status: 409 },
      );
    }

    const created = await prisma.expensePreset.createMany({
      data: DEFAULT_EXPENSE_PRESETS.map((p, idx) => ({
        clientId: user.clientId!,
        title: p.title,
        category: p.category,
        amount: p.amount,
        active: true,
        sortOrder: idx,
      })),
    });

    await logAudit(req, { actorType: "user", user }, {
      action: "expensePreset.seeded",
      entityType: "ExpensePreset",
      entityLabel: `${created.count} starter expense presets`,
      summary: `Seeded ${created.count} default expense presets`,
    });

    return NextResponse.json({ created: created.count });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
