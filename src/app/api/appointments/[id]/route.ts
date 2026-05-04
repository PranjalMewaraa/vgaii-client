import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { getUser } from "@/middleware/auth";
import { checkRole, checkModule } from "@/lib/rbac";
import { withClientFilter } from "@/lib/query";
import { appointmentUpdateSchema } from "@/lib/validators/appointment";
import { getErrorMessage } from "@/lib/errors";
import { logAudit } from "@/lib/audit";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: RouteContext) {
  try {
    const user = getUser(req);
    checkRole(user, ["CLIENT_ADMIN", "STAFF"]);
    checkModule(user, "appointments");

    const { id } = await ctx.params;
    const scope = withClientFilter(user);

    const body = await req.json();
    const parsed = appointmentUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const appt = await prisma.appointment.findFirst({
      where: { id, ...(scope as { clientId?: string }) },
    });
    if (!appt) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 },
      );
    }

    const previousStatus = appt.status;
    const previousLeadId = appt.leadId;
    const data: Prisma.AppointmentUncheckedUpdateInput = {};

    if (parsed.data.status !== undefined) {
      data.status = parsed.data.status;
      data.completedAt =
        parsed.data.status === "completed" ? new Date() : null;
    }
    if (parsed.data.notes !== undefined) data.notes = parsed.data.notes;
    if (parsed.data.date !== undefined) data.date = new Date(parsed.data.date);
    if (parsed.data.diagnosis !== undefined) {
      data.diagnosis = parsed.data.diagnosis;
    }
    if (parsed.data.medicines !== undefined) {
      data.medicines = parsed.data.medicines;
    }
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.phone !== undefined) data.phone = parsed.data.phone;
    if (parsed.data.email !== undefined) data.email = parsed.data.email;
    if (parsed.data.age !== undefined) data.age = parsed.data.age;
    if (parsed.data.gender !== undefined) data.gender = parsed.data.gender;

    // Manual link to an existing lead (used to repair orphan appointments
    // when the booking-source didn't carry a matchable phone). Verify the
    // target lead lives in the same client.
    if (parsed.data.leadId !== undefined) {
      if (parsed.data.leadId === null) {
        data.leadId = null;
      } else {
        const target = await prisma.lead.findFirst({
          where: {
            id: parsed.data.leadId,
            ...(user.clientId ? { clientId: user.clientId } : {}),
          },
          select: { id: true, status: true },
        });
        if (!target) {
          return NextResponse.json(
            { error: "Patient not in this client" },
            { status: 400 },
          );
        }
        data.leadId = target.id;
        // If we're linking for the first time and the lead hasn't reached
        // the appointment-booked stage, bump it. Don't demote leads that
        // are already visited or lost.
        if (
          !previousLeadId &&
          target.status !== "appointment_booked" &&
          target.status !== "visited" &&
          target.status !== "lost"
        ) {
          await prisma.lead.update({
            where: { id: target.id },
            data: { status: "appointment_booked", statusUpdatedAt: new Date() },
          });
        }
      }
    }

    const updated = await prisma.appointment.update({
      where: { id: appt.id },
      data,
    });

    // Promote the linked lead to "visited" the first time this appointment
    // resolves to either `completed` or `no_show`. We treat both the same
    // for funnel purposes — a no-show still keeps the patient on our active
    // roster (per product spec). The match is filtered to status =
    // appointment_booked so we never demote leads that are already visited
    // or lost.
    const becameTerminal =
      parsed.data.status === "completed" || parsed.data.status === "no_show";
    const wasAlreadyTerminal =
      previousStatus === "completed" || previousStatus === "no_show";
    if (becameTerminal && !wasAlreadyTerminal && updated.leadId) {
      await prisma.lead.updateMany({
        where: { id: updated.leadId, status: "appointment_booked" },
        data: { status: "visited", statusUpdatedAt: new Date() },
      });
    }

    const apptLabel = updated.date
      ? `${updated.name ?? "Unnamed"} · ${new Date(updated.date).toLocaleString()}`
      : updated.name ?? "Unnamed";

    if (
      parsed.data.status !== undefined &&
      parsed.data.status !== previousStatus
    ) {
      await logAudit(req, { actorType: "user", user }, {
        action: "appointment.status.changed",
        entityType: "Appointment",
        entityId: updated.id,
        entityLabel: apptLabel,
        summary: `Status: ${previousStatus ?? "—"} → ${parsed.data.status}`,
        metadata: { from: previousStatus, to: parsed.data.status },
      });
    }
    if (parsed.data.diagnosis !== undefined || parsed.data.medicines !== undefined) {
      await logAudit(req, { actorType: "user", user }, {
        action: "appointment.clinical.updated",
        entityType: "Appointment",
        entityId: updated.id,
        entityLabel: apptLabel,
        summary: "Diagnosis/medicines updated",
      });
    }
    if (parsed.data.leadId !== undefined) {
      await logAudit(req, { actorType: "user", user }, {
        action: parsed.data.leadId === null ? "appointment.unlinked" : "appointment.linked",
        entityType: "Appointment",
        entityId: updated.id,
        entityLabel: apptLabel,
        summary:
          parsed.data.leadId === null ? "Unlinked from patient" : "Linked to patient",
        metadata: { leadId: parsed.data.leadId },
      });
    }

    return NextResponse.json({ appointment: updated });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function DELETE(req: Request, ctx: RouteContext) {
  try {
    const user = getUser(req);
    checkRole(user, ["CLIENT_ADMIN", "STAFF"]);
    checkModule(user, "appointments");

    const { id } = await ctx.params;
    const scope = withClientFilter(user);

    const existing = await prisma.appointment.findFirst({
      where: { id, ...(scope as { clientId?: string }) },
      select: { id: true, name: true, date: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 },
      );
    }

    await prisma.appointment.delete({ where: { id: existing.id } });

    const label = existing.date
      ? `${existing.name ?? "Unnamed"} · ${new Date(existing.date).toLocaleString()}`
      : existing.name ?? "Unnamed";
    await logAudit(req, { actorType: "user", user }, {
      action: "appointment.deleted",
      entityType: "Appointment",
      entityId: existing.id,
      entityLabel: label,
      summary: "Appointment deleted",
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
