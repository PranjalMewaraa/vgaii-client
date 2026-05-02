import { connectDB } from "@/lib/db";
import Appointment from "@/models/Appointment";
import Lead from "@/models/Lead";
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
    await connectDB();
    const user = getUser(req);
    checkRole(user, ["CLIENT_ADMIN", "STAFF"]);
    checkModule(user, "appointments");

    const { id } = await ctx.params;
    const filter = withClientFilter(user);

    const body = await req.json();
    const parsed = appointmentUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const appt = await Appointment.findOne({ ...filter, _id: id });
    if (!appt) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 },
      );
    }

    const previousStatus = appt.status;
    if (parsed.data.status !== undefined) {
      appt.status = parsed.data.status;
      appt.completedAt =
        parsed.data.status === "completed" ? new Date() : undefined;
    }
    if (parsed.data.notes !== undefined) appt.notes = parsed.data.notes;
    if (parsed.data.date !== undefined) appt.date = new Date(parsed.data.date);
    if (parsed.data.diagnosis !== undefined) {
      appt.diagnosis = parsed.data.diagnosis;
    }
    if (parsed.data.medicines !== undefined) {
      appt.medicines = parsed.data.medicines;
    }
    if (parsed.data.name !== undefined) appt.name = parsed.data.name;
    if (parsed.data.phone !== undefined) appt.phone = parsed.data.phone;
    if (parsed.data.email !== undefined) appt.email = parsed.data.email;
    if (parsed.data.age !== undefined) appt.age = parsed.data.age;
    if (parsed.data.gender !== undefined) appt.gender = parsed.data.gender;

    // Manual link to an existing lead (used to repair orphan appointments
    // when the booking-source didn't carry a matchable phone). Verify the
    // target lead lives in the same client.
    if (parsed.data.leadId !== undefined) {
      const previousLeadId = appt.leadId;
      if (parsed.data.leadId === null) {
        appt.leadId = undefined;
      } else {
        const target = await Lead.findOne({
          _id: parsed.data.leadId,
          clientId: user.clientId,
        }).select("_id status");
        if (!target) {
          return NextResponse.json(
            { error: "Patient not in this client" },
            { status: 400 },
          );
        }
        appt.leadId = target._id;
        // If we're linking for the first time and the lead hasn't reached
        // the appointment-booked stage, bump it. Don't demote leads that
        // are already visited or lost.
        if (
          !previousLeadId &&
          target.status !== "appointment_booked" &&
          target.status !== "visited" &&
          target.status !== "lost"
        ) {
          await Lead.updateOne(
            { _id: target._id },
            {
              status: "appointment_booked",
              statusUpdatedAt: new Date(),
            },
          );
        }
      }
    }

    await appt.save();

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
    if (becameTerminal && !wasAlreadyTerminal && appt.leadId) {
      await Lead.updateOne(
        { _id: appt.leadId, status: "appointment_booked" },
        { status: "visited", statusUpdatedAt: new Date() },
      );
    }

    const apptLabel = appt.date
      ? `${appt.name ?? "Unnamed"} · ${new Date(appt.date).toLocaleString()}`
      : appt.name ?? "Unnamed";

    if (
      parsed.data.status !== undefined &&
      parsed.data.status !== previousStatus
    ) {
      await logAudit(req, { actorType: "user", user }, {
        action: "appointment.status.changed",
        entityType: "Appointment",
        entityId: appt._id.toString(),
        entityLabel: apptLabel,
        summary: `Status: ${previousStatus ?? "—"} → ${parsed.data.status}`,
        metadata: { from: previousStatus, to: parsed.data.status },
      });
    }
    if (parsed.data.diagnosis !== undefined || parsed.data.medicines !== undefined) {
      await logAudit(req, { actorType: "user", user }, {
        action: "appointment.clinical.updated",
        entityType: "Appointment",
        entityId: appt._id.toString(),
        entityLabel: apptLabel,
        summary: "Diagnosis/medicines updated",
      });
    }
    if (parsed.data.leadId !== undefined) {
      await logAudit(req, { actorType: "user", user }, {
        action: parsed.data.leadId === null ? "appointment.unlinked" : "appointment.linked",
        entityType: "Appointment",
        entityId: appt._id.toString(),
        entityLabel: apptLabel,
        summary: parsed.data.leadId === null
          ? "Unlinked from patient"
          : "Linked to patient",
        metadata: { leadId: parsed.data.leadId },
      });
    }

    return NextResponse.json({ appointment: appt });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function DELETE(req: Request, ctx: RouteContext) {
  try {
    await connectDB();
    const user = getUser(req);
    checkRole(user, ["CLIENT_ADMIN", "STAFF"]);
    checkModule(user, "appointments");

    const { id } = await ctx.params;
    const filter = withClientFilter(user);

    const existing = await Appointment.findOne({ ...filter, _id: id }).lean<{
      _id: unknown;
      name?: string;
      date?: Date;
    } | null>();

    const result = await Appointment.deleteOne({ ...filter, _id: id });
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 },
      );
    }

    if (existing) {
      const label = existing.date
        ? `${existing.name ?? "Unnamed"} · ${new Date(existing.date).toLocaleString()}`
        : existing.name ?? "Unnamed";
      await logAudit(req, { actorType: "user", user }, {
        action: "appointment.deleted",
        entityType: "Appointment",
        entityId: String(existing._id),
        entityLabel: label,
        summary: "Appointment deleted",
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
