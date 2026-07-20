import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { getUser } from "@/middleware/auth";
import { checkRole, checkModule } from "@/lib/rbac";
import { prescriptionCreateSchema } from "@/lib/validators/prescription";
import { getErrorMessage } from "@/lib/errors";
import { logAudit } from "@/lib/audit";
import { NextResponse } from "next/server";

// Creating a prescription records a new completed visit (encounter) for a
// patient: it materialises an Appointment row dated today carrying the
// diagnosis, observations, vitals, and structured medicines. Mirrors the
// lead-status bump in POST /api/appointments.
export async function POST(req: Request) {
  try {
    const user = getUser(req);
    checkRole(user, ["CLIENT_ADMIN", "STAFF"]);
    checkModule(user, "patients");

    if (!user.clientId) {
      return NextResponse.json({ error: "No client context" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = prescriptionCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const input = parsed.data;

    // The prescription must belong to a patient of this tenant. Copy identity
    // onto the appointment so it renders standalone (same shape the booking
    // flow writes).
    const lead = await prisma.lead.findFirst({
      where: { id: input.leadId, clientId: user.clientId },
      select: { id: true, name: true, phone: true, age: true, gender: true, status: true },
    });
    if (!lead) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const when = input.date ? new Date(input.date) : new Date();

    const data: Prisma.AppointmentUncheckedCreateInput = {
      clientId: user.clientId,
      leadId: lead.id,
      name: lead.name,
      phone: lead.phone,
      age: lead.age ?? null,
      gender: lead.gender ?? null,
      date: when,
      status: "completed",
      completedAt: when,
      notes: "",
      diagnosis: input.diagnosis ?? "",
      encounterType: input.encounterType ?? null,
      diagnosisCode: input.diagnosisCode ?? null,
      diagnosisStatus: input.diagnosisStatus ?? null,
      observations: input.observations ?? null,
      medicines: input.medicines ?? [],
      weightKg: input.weightKg ?? null,
      sugarMgDl: input.sugarMgDl ?? null,
      bpSystolic: input.bpSystolic ?? null,
      bpDiastolic: input.bpDiastolic ?? null,
      source: "manual",
    };

    const appointment = await prisma.appointment.create({ data });

    // A completed encounter means the patient has visited. Never demote a lead
    // that's already terminal (visited / lost).
    if (lead.status !== "visited" && lead.status !== "lost") {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { status: "visited", statusUpdatedAt: new Date() },
      });
    }

    await logAudit(req, { actorType: "user", user }, {
      action: "prescription.created",
      entityType: "Appointment",
      entityId: appointment.id,
      entityLabel: lead.name,
      summary: `Prescription recorded (${(input.medicines ?? []).length} medicine${
        (input.medicines ?? []).length === 1 ? "" : "s"
      })`,
      metadata: {
        leadId: lead.id,
        diagnosis: input.diagnosis,
        diagnosisCode: input.diagnosisCode,
      },
    });

    return NextResponse.json({ appointment });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
