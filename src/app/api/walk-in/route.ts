import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { createLead } from "@/repos/lead";
import { getUser } from "@/middleware/auth";
import { checkRole, checkModule } from "@/lib/rbac";
import { withClientFilter } from "@/lib/query";
import { walkInSchema } from "@/lib/validators/walkin";
import { canonicalPhone } from "@/lib/phone";
import { generateFeedbackToken } from "@/lib/feedback-token";
import { getErrorMessage } from "@/lib/errors";
import { logAudit } from "@/lib/audit";
import { NextResponse } from "next/server";

// GET /api/walk-in?phone=... → existing patients (leads) whose canonical phone
// matches, so the walk-in form can offer to link instead of creating a dupe.
export async function GET(req: Request) {
  try {
    const user = getUser(req);
    checkRole(user, ["CLIENT_ADMIN", "STAFF"]);
    checkModule(user, "appointments");

    const url = new URL(req.url);
    const phone = url.searchParams.get("phone") ?? "";
    const canonical = canonicalPhone(phone);
    if (canonical.length < 4) return NextResponse.json({ matches: [] });

    const scope = withClientFilter(user) as { clientId?: string };
    const matches = await prisma.lead.findMany({
      where: { ...scope, phoneNormalized: canonical },
      select: { id: true, name: true, phone: true, age: true, gender: true, status: true },
      orderBy: { statusUpdatedAt: "desc" },
      take: 5,
    });

    return NextResponse.json({ matches });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

// POST /api/walk-in → identify (link) or create the patient, then record a
// completed visit for them. Atomic so we never leave a patient without the
// visit that justified creating them.
export async function POST(req: Request) {
  try {
    const user = getUser(req);
    checkRole(user, ["CLIENT_ADMIN", "STAFF"]);
    checkModule(user, "appointments");

    if (!user.clientId) {
      return NextResponse.json({ error: "No client context" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = walkInSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const input = parsed.data;

    // 1. Resolve the patient — link to an existing lead, or create a new one.
    let lead: { id: string; name: string; phone: string; status: string };
    let createdPatient = false;

    if (input.linkLeadId) {
      const existing = await prisma.lead.findFirst({
        where: { id: input.linkLeadId, clientId: user.clientId },
        select: { id: true, name: true, phone: true, status: true },
      });
      if (!existing) {
        return NextResponse.json(
          { error: "Selected patient not found" },
          { status: 404 },
        );
      }
      lead = existing;
    } else {
      const created = await createLead({
        name: input.name,
        phone: input.phone,
        age: input.age ?? null,
        gender: input.gender ?? null,
        source: "walkin",
        notes: "",
        // A walk-in patient has, by definition, visited.
        status: "visited",
        statusUpdatedAt: new Date(),
        feedbackToken: generateFeedbackToken(),
        clientId: user.clientId,
        createdById: user.id,
      });
      lead = { id: created.id, name: created.name, phone: created.phone, status: created.status };
      createdPatient = true;
    }

    // 2. Record the completed visit.
    const now = new Date();
    const data: Prisma.AppointmentUncheckedCreateInput = {
      clientId: user.clientId,
      leadId: lead.id,
      name: lead.name,
      phone: lead.phone,
      age: input.age ?? null,
      gender: input.gender ?? null,
      date: now,
      status: "completed",
      completedAt: now,
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
      source: "walkin",
    };
    const appointment = await prisma.appointment.create({ data });

    // 3. A linked lead that hasn't reached a terminal stage is now visited.
    if (!createdPatient && lead.status !== "visited" && lead.status !== "lost") {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { status: "visited", statusUpdatedAt: new Date() },
      });
    }

    await logAudit(req, { actorType: "user", user }, {
      action: "walkin.recorded",
      entityType: "Appointment",
      entityId: appointment.id,
      entityLabel: lead.name,
      summary: createdPatient
        ? "Walk-in recorded (new patient)"
        : "Walk-in recorded (existing patient)",
      metadata: { leadId: lead.id, createdPatient },
    });

    return NextResponse.json({ appointment, lead, createdPatient });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
