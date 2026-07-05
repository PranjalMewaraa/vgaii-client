import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { getUser } from "@/middleware/auth";
import { checkRole, checkModule } from "@/lib/rbac";
import { withClientFilter } from "@/lib/query";
import { appointmentCreateSchema } from "@/lib/validators/appointment";
import { getBookingConfig, overlapsExisting } from "@/lib/booking";
import { sendAppointmentConfirmation } from "@/lib/mail";
import { logAudit } from "@/lib/audit";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

// Thrown inside the booking transaction when the chosen slot was taken by a
// concurrent request; mapped to a 409 below.
class SlotTakenError extends Error {}

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
    // before we attach. Cross-tenant linkage would leak data. Status is
    // fetched here too so we can bump the lead to appointment_booked below
    // once the appointment is actually created.
    let bumpLead: { id: string; status: string } | null = null;
    if (parsed.data.leadId) {
      const lead = await prisma.lead.findFirst({
        where: { id: parsed.data.leadId, clientId: user.clientId },
        select: { id: true, status: true },
      });
      if (!lead) {
        return NextResponse.json({ error: "Lead not found" }, { status: 400 });
      }
      bumpLead = lead;
    }

    // Self-hosted booking: when enabled and the caller sends a slot length
    // (i.e. from the SlotPicker), prevent double-booking. Walk-in manual posts
    // omit durationMin and stay exempt.
    const client = await prisma.client.findUnique({
      where: { id: user.clientId },
      select: { bookingConfig: true, name: true },
    });
    const config = getBookingConfig(client?.bookingConfig);
    const start = new Date(parsed.data.date);
    const useSlot = config.enabled && parsed.data.durationMin != null;

    const data: Prisma.AppointmentUncheckedCreateInput = {
      clientId: user.clientId,
      leadId: parsed.data.leadId ?? null,
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      age: parsed.data.age ?? null,
      gender: parsed.data.gender ?? null,
      date: start,
      notes: parsed.data.notes ?? "",
      diagnosis: "",
      medicines: [],
      source: "manual",
      durationMin: useSlot ? parsed.data.durationMin : null,
    };

    let appointment;
    if (useSlot) {
      const duration = parsed.data.durationMin!;
      const end = new Date(start.getTime() + duration * 60000);
      try {
        appointment = await prisma.$transaction(async tx => {
          // Re-check overlap inside the txn against still-scheduled appts in a
          // window around the slot (24h back covers any reasonable duration).
          const candidates = await tx.appointment.findMany({
            where: {
              clientId: user.clientId!,
              status: "scheduled",
              date: { gte: new Date(start.getTime() - 86_400_000), lt: end },
            },
            select: { date: true, durationMin: true },
          });
          const existing = candidates
            .filter(c => c.date)
            .map(c => ({ startUtc: c.date as Date, durationMin: c.durationMin }));
          if (overlapsExisting(start, duration, existing)) {
            throw new SlotTakenError();
          }
          return tx.appointment.create({ data });
        });
      } catch (e) {
        if (e instanceof SlotTakenError) {
          return NextResponse.json(
            { error: "That slot was just booked. Pick another time." },
            { status: 409 },
          );
        }
        throw e;
      }
    } else {
      appointment = await prisma.appointment.create({ data });
    }

    // Mirrors the bump in PATCH /api/appointments/[id]: once a lead has an
    // appointment on the books, move it past "qualified". Never demotes a
    // lead that's already further along (or lost).
    if (
      bumpLead &&
      bumpLead.status !== "appointment_booked" &&
      bumpLead.status !== "visited" &&
      bumpLead.status !== "lost"
    ) {
      await prisma.lead.update({
        where: { id: bumpLead.id },
        data: { status: "appointment_booked", statusUpdatedAt: new Date() },
      });
    }

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

    // Best-effort confirmation email for future appointments with an email on
    // file (no-op unless SMTP is configured; never throws).
    if (
      appointment.email &&
      appointment.date &&
      appointment.date.getTime() > Date.now()
    ) {
      await sendAppointmentConfirmation({
        to: appointment.email,
        name: appointment.name ?? undefined,
        whenLocalLabel: new Intl.DateTimeFormat("en-US", {
          timeZone: config.timezone,
          dateStyle: "medium",
          timeStyle: "short",
        }).format(appointment.date),
        clinicName: client?.name ?? undefined,
      });
    }

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
