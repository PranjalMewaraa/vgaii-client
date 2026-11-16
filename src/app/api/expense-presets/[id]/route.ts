import { prisma } from "@/lib/prisma";
import { getUser } from "@/middleware/auth";
import { checkRole } from "@/lib/rbac";
import { withClientFilter } from "@/lib/query";
import { expensePresetUpdateSchema } from "@/lib/validators/payment";
import { logAudit } from "@/lib/audit";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = getUser(req);
    checkRole(user, ["CLIENT_ADMIN"]);
    const { id } = await params;

    const scope = withClientFilter(user) as { clientId?: string };
    const existing = await prisma.expensePreset.findFirst({
      where: { id, ...scope },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = expensePresetUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const preset = await prisma.expensePreset.update({
      where: { id },
      data: parsed.data,
    });

    await logAudit(req, { actorType: "user", user }, {
      action: "expensePreset.updated",
      entityType: "ExpensePreset",
      entityId: preset.id,
      entityLabel: preset.title,
      summary: "Expense preset updated",
      metadata: parsed.data as Record<string, unknown>,
    });

    return NextResponse.json({ preset });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

// Hard delete — expenses created from a preset store their own
// category/amount/notes, so removing the preset doesn't touch history.
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = getUser(req);
    checkRole(user, ["CLIENT_ADMIN"]);
    const { id } = await params;

    const scope = withClientFilter(user) as { clientId?: string };
    const existing = await prisma.expensePreset.findFirst({
      where: { id, ...scope },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.expensePreset.delete({ where: { id } });

    await logAudit(req, { actorType: "user", user }, {
      action: "expensePreset.deleted",
      entityType: "ExpensePreset",
      entityId: existing.id,
      entityLabel: existing.title,
      summary: `Expense preset "${existing.title}" removed`,
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
