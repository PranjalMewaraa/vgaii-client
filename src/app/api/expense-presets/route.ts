import { prisma } from "@/lib/prisma";
import { getUser } from "@/middleware/auth";
import { checkRole, checkModule } from "@/lib/rbac";
import { withClientFilter } from "@/lib/query";
import { expensePresetCreateSchema } from "@/lib/validators/payment";
import { logAudit } from "@/lib/audit";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const user = getUser(req);
    checkRole(user, ["CLIENT_ADMIN", "STAFF"]);
    checkModule(user, "payments");

    const url = new URL(req.url);
    const includeInactive = url.searchParams.get("includeInactive") === "1";

    const scope = withClientFilter(user) as { clientId?: string };
    const presets = await prisma.expensePreset.findMany({
      where: { ...scope, ...(includeInactive ? {} : { active: true }) },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json({ presets });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

// Only CLIENT_ADMIN can add a new preset — staff use them, admins curate them.
export async function POST(req: Request) {
  try {
    const user = getUser(req);
    checkRole(user, ["CLIENT_ADMIN"]);
    if (!user.clientId) {
      return NextResponse.json({ error: "No client context" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = expensePresetCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const preset = await prisma.expensePreset.create({
      data: {
        clientId: user.clientId,
        title: parsed.data.title,
        category: parsed.data.category,
        amount: parsed.data.amount,
        active: parsed.data.active ?? true,
        sortOrder: parsed.data.sortOrder ?? 0,
      },
    });

    await logAudit(req, { actorType: "user", user }, {
      action: "expensePreset.created",
      entityType: "ExpensePreset",
      entityId: preset.id,
      entityLabel: preset.title,
      summary: `Expense preset "${preset.title}" added at ${preset.amount} paise`,
      metadata: { category: preset.category, amount: preset.amount },
    });

    return NextResponse.json({ preset });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
