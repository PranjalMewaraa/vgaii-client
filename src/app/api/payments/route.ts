import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { getUser } from "@/middleware/auth";
import { checkRole, checkModule } from "@/lib/rbac";
import { withClientFilter } from "@/lib/query";
import { paymentCreateSchema } from "@/lib/validators/payment";
import { logAudit } from "@/lib/audit";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const user = getUser(req);
    checkRole(user, ["CLIENT_ADMIN", "STAFF"]);
    checkModule(user, "payments");

    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const method = url.searchParams.get("method");
    const leadId = url.searchParams.get("leadId");
    const collectedBy = url.searchParams.get("collectedBy");

    const where: Prisma.PaymentWhereInput = withClientFilter(
      user,
    ) as Prisma.PaymentWhereInput;
    if (from || to) {
      const range: { gte?: Date; lte?: Date } = {};
      if (from && !Number.isNaN(Date.parse(from))) range.gte = new Date(from);
      if (to && !Number.isNaN(Date.parse(to))) range.lte = new Date(to);
      if (Object.keys(range).length > 0) where.createdAt = range;
    }
    if (method) {
      where.paymentMethod = method as Prisma.PaymentWhereInput["paymentMethod"];
    }
    if (leadId) where.leadId = leadId;
    if (collectedBy) where.collectedById = collectedBy;

    const payments = await prisma.payment.findMany({
      where,
      include: {
        items: true,
        lead: { select: { id: true, name: true, phone: true } },
        collectedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json({ payments });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = getUser(req);
    checkRole(user, ["CLIENT_ADMIN", "STAFF"]);
    checkModule(user, "payments");

    if (!user.clientId) {
      return NextResponse.json({ error: "No client context" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = paymentCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { leadId, appointmentId, items, discount = 0 } = parsed.data;

    // Cross-tenant safety: any linked lead/appointment must belong to the
    // caller's client. SetNull on FK delete protects us against drift but
    // catching it on write keeps the audit log honest.
    if (leadId) {
      const lead = await prisma.lead.findFirst({
        where: { id: leadId, clientId: user.clientId },
        select: { id: true, name: true, phone: true },
      });
      if (!lead) {
        return NextResponse.json({ error: "Lead not found" }, { status: 400 });
      }
    }
    if (appointmentId) {
      const appt = await prisma.appointment.findFirst({
        where: { id: appointmentId, clientId: user.clientId },
        select: { id: true },
      });
      if (!appt) {
        return NextResponse.json(
          { error: "Appointment not found" },
          { status: 400 },
        );
      }
    }

    // Snapshot preset titles on the items at write-time. If the admin
    // renames or deletes the preset later, the receipt still reflects
    // what the receptionist actually clicked.
    const totalAmount = items.reduce((s, i) => s + i.amount, 0);
    const finalAmount = Math.max(0, totalAmount - discount);

    const payment = await prisma.payment.create({
      data: {
        clientId: user.clientId,
        leadId: leadId ?? null,
        appointmentId: appointmentId ?? null,
        patientName: parsed.data.patientName ?? null,
        patientPhone: parsed.data.patientPhone ?? null,
        amount: totalAmount,
        discount,
        finalAmount,
        paymentMethod: parsed.data.paymentMethod,
        notes: parsed.data.notes ?? "",
        collectedById: user.id,
        items: {
          create: items.map(i => ({
            presetChargeId: i.presetChargeId ?? null,
            title: i.title,
            amount: i.amount,
          })),
        },
      },
      include: { items: true },
    });

    await logAudit(req, { actorType: "user", user }, {
      action: "payment.created",
      entityType: "Payment",
      entityId: payment.id,
      entityLabel: parsed.data.patientName ?? leadId ?? payment.id,
      summary: `Collected ${payment.finalAmount} paise via ${payment.paymentMethod}`,
      metadata: {
        amount: payment.amount,
        discount: payment.discount,
        finalAmount: payment.finalAmount,
        method: payment.paymentMethod,
        leadId: payment.leadId,
        appointmentId: payment.appointmentId,
      },
    });

    return NextResponse.json({ payment });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
