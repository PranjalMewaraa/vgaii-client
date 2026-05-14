import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { getUser } from "@/middleware/auth";
import { checkRole, checkModule } from "@/lib/rbac";
import { withClientFilter } from "@/lib/query";
import { appointmentCreateSchema } from "@/lib/validators/appointment";
import { logAudit } from "@/lib/audit";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const user = getUser(req);
    checkRole(user, ["CLIENT_ADMIN", "STAFF"]);
    checkModule(user, "appointments");

    if (!user.clientId) {
      return NextResponse.json({ error: "No client context" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = appointmentCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    // If the caller passed a leadId, make sure it belongs to the same client
    // before we attach. Cross-tenant linkage would leak data.
    if (parsed.data.leadId) {
      const lead = await prisma.lead.findFirst({
        where: { id: parsed.data.leadId, clientId: user.clientId },
        select: { id: true },
      });
      if (!lead) {
        return NextResponse.json({ error: "Lead not found" }, { status: 400 });
      }
    }

    const appointment = await prisma.appointment.create({
      data: {
        clientId: user.clientId,
        leadId: parsed.data.leadId ?? null,
        name: parsed.data.name,
        phone: parsed.data.phone,
        email: parsed.data.email || null,
        age: parsed.data.age ?? null,
        gender: parsed.data.gender ?? null,
        date: new Date(parsed.data.date),
        notes: parsed.data.notes ?? "",
        diagnosis: "",
        medicines: [],
        source: "manual",
      },
    });

    await logAudit(req, { actorType: "user", user }, {
      action: "appointment.created",
      entityType: "Appointment",
      entityId: appointment.id,
      entityLabel: appointment.name ?? appointment.phone ?? appointment.id,
      summary: `Appointment scheduled for ${new Date(appointment.date!).toLocaleString()}`,
      metadata: {
        phone: appointment.phone,
        leadId: appointment.leadId,
        source: appointment.source,
      },
    });

    return NextResponse.json({ appointment });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const user = getUser(req);
    checkRole(user, ["CLIENT_ADMIN", "STAFF"]);
    checkModule(user, "appointments");

    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("search")?.trim();
    const fromParam = url.searchParams.get("from");
    const toParam = url.searchParams.get("to");

    const where: Prisma.AppointmentWhereInput = withClientFilter(
      user,
    ) as Prisma.AppointmentWhereInput;
    if (status) {
      where.status = status as Prisma.AppointmentWhereInput["status"];
    }
    if (fromParam || toParam) {
      const dateFilter: { gte?: Date; lte?: Date } = {};
      if (fromParam && !Number.isNaN(Date.parse(fromParam))) {
        dateFilter.gte = new Date(fromParam);
      }
      if (toParam && !Number.isNaN(Date.parse(toParam))) {
        dateFilter.lte = new Date(toParam);
      }
      if (Object.keys(dateFilter).length > 0) where.date = dateFilter;
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const appointments = await prisma.appointment.findMany({
      where,
      orderBy: { date: "asc" },
    });

    return NextResponse.json({ appointments });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
