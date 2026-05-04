import { prisma } from "@/lib/prisma";
import { createLead } from "@/repos/lead";
import type { Prisma } from "@/generated/prisma/client";
import { getUser } from "@/middleware/auth";
import { withClientFilter } from "@/lib/query";
import { patientCreateSchema } from "@/lib/validators/patient";
import { generateFeedbackToken } from "@/lib/feedback-token";
import { getErrorMessage } from "@/lib/errors";
import { logAudit } from "@/lib/audit";
import { NextResponse } from "next/server";

type PatientRow = {
  kind: "lead" | "direct";
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  age?: number | null;
  gender?: string | null;
  status?: string;
  outcomeRating?: number | null;
  lastAppointmentDate?: Date | null;
  appointmentsCount: number;
  hasFeedback: boolean;
  source?: string | null;
  createdAt?: Date;
};

export async function GET(req: Request) {
  try {
    const user = getUser(req);
    const scope = withClientFilter(user) as { clientId?: string };

    const url = new URL(req.url);
    const search = url.searchParams.get("search")?.trim();

    const leadWhere: Prisma.LeadWhereInput = {
      ...scope,
      status: { in: ["qualified", "appointment_booked", "visited"] },
    };
    if (search) {
      leadWhere.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const [leads, orphanAppointments, feedbacks] = await Promise.all([
      prisma.lead.findMany({ where: leadWhere }),
      prisma.appointment.findMany({
        where: {
          ...scope,
          leadId: null,
          ...(search
            ? {
                OR: [
                  { name: { contains: search } },
                  { phone: { contains: search } },
                ],
              }
            : {}),
        },
      }),
      prisma.feedback.findMany({
        where: scope,
        select: { leadId: true },
      }),
    ]);

    const feedbackByLead = new Set(
      feedbacks.map(f => f.leadId).filter(Boolean) as string[],
    );

    const leadIds = leads.map(l => l.id);
    const apptsForLeads = leadIds.length
      ? await prisma.appointment.findMany({
          where: { ...scope, leadId: { in: leadIds } },
          orderBy: { date: "desc" },
        })
      : [];

    const apptsByLead = new Map<string, typeof apptsForLeads>();
    for (const a of apptsForLeads) {
      if (!a.leadId) continue;
      const arr = apptsByLead.get(a.leadId) ?? [];
      arr.push(a);
      apptsByLead.set(a.leadId, arr);
    }

    const leadRows: PatientRow[] = leads.map(l => {
      const appts = apptsByLead.get(l.id) ?? [];
      return {
        kind: "lead",
        id: l.id,
        name: l.name,
        phone: l.phone,
        email: l.email,
        age: l.age,
        gender: l.gender,
        status: l.status,
        outcomeRating: l.outcomeRating,
        lastAppointmentDate: appts[0]?.date ?? null,
        appointmentsCount: appts.length,
        hasFeedback: feedbackByLead.has(l.id),
        source: l.source,
        createdAt: l.createdAt,
      };
    });

    const orphanRows: PatientRow[] = orphanAppointments.map(a => ({
      kind: "direct",
      id: a.id,
      name: a.name ?? "Unnamed",
      phone: a.phone ?? "",
      email: a.email,
      age: a.age,
      gender: a.gender,
      lastAppointmentDate: a.date ?? null,
      appointmentsCount: 1,
      hasFeedback: false,
      source: a.source,
      createdAt: a.createdAt,
    }));

    const all = [...leadRows, ...orphanRows].sort((a, b) => {
      const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bd - ad;
    });

    return NextResponse.json({ patients: all });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = getUser(req);

    if (!user.clientId) {
      return NextResponse.json({ error: "No client context" }, { status: 400 });
    }
    if (user.role !== "CLIENT_ADMIN" && user.role !== "STAFF") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = patientCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const lead = await createLead({
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email,
      age: parsed.data.age,
      gender: parsed.data.gender,
      area: parsed.data.area,
      source: parsed.data.source ?? "manual",
      notes: parsed.data.notes ?? "",
      status: "qualified",
      statusUpdatedAt: new Date(),
      feedbackToken: generateFeedbackToken(),
      clientId: user.clientId,
      createdById: user.id,
    });

    await logAudit(req, { actorType: "user", user }, {
      action: "patient.created",
      entityType: "Lead",
      entityId: lead.id,
      entityLabel: lead.name,
      summary: "Patient added directly (qualified)",
      metadata: { source: lead.source },
    });

    return NextResponse.json({ patient: lead }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
