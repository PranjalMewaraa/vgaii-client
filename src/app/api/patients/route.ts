import { connectDB } from "@/lib/db";
import Lead from "@/models/Lead";
import Appointment from "@/models/Appointment";
import Feedback from "@/models/Feedback";
import { getUser } from "@/middleware/auth";
import { withClientFilter } from "@/lib/query";
import { patientCreateSchema } from "@/lib/validators/patient";
import { generateFeedbackToken } from "@/lib/feedback-token";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

const PATIENT_LEAD_STATUSES = [
  "qualified",
  "appointment_booked",
  "visited",
] as const;

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

type PatientRow = {
  kind: "lead" | "direct";
  id: string;
  name: string;
  phone: string;
  email?: string;
  age?: number;
  gender?: string;
  status?: string;
  outcomeRating?: number;
  lastAppointmentDate?: Date | null;
  appointmentsCount: number;
  hasFeedback: boolean;
  source?: string;
  createdAt?: Date;
};

export async function GET(req: Request) {
  try {
    await connectDB();
    const user = getUser(req);
    const filter = withClientFilter(user);

    const url = new URL(req.url);
    const search = url.searchParams.get("search")?.trim();

    const leadFilter: Record<string, unknown> = {
      ...filter,
      status: { $in: PATIENT_LEAD_STATUSES },
    };
    if (search) {
      const re = new RegExp(escapeRegex(search), "i");
      leadFilter.$or = [{ name: re }, { phone: re }];
    }

    const [leads, orphanAppointments, feedbacks] = await Promise.all([
      Lead.find(leadFilter).lean(),
      Appointment.find({
        ...filter,
        leadId: { $in: [null, undefined] },
        ...(search
          ? {
              $or: [
                { name: new RegExp(escapeRegex(search), "i") },
                { phone: new RegExp(escapeRegex(search), "i") },
              ],
            }
          : {}),
      }).lean(),
      Feedback.find(filter).select("leadId").lean(),
    ]);

    const feedbackByLead = new Set(
      feedbacks.map(f => f.leadId?.toString()).filter(Boolean) as string[],
    );

    const leadIds = leads.map(l => l._id);
    const apptsForLeads = leadIds.length
      ? await Appointment.find({
          ...filter,
          leadId: { $in: leadIds },
        })
          .sort({ date: -1 })
          .lean()
      : [];

    const apptsByLead = new Map<string, typeof apptsForLeads>();
    for (const a of apptsForLeads) {
      const key = a.leadId?.toString();
      if (!key) continue;
      const arr = apptsByLead.get(key) ?? [];
      arr.push(a);
      apptsByLead.set(key, arr);
    }

    const leadRows: PatientRow[] = leads.map(l => {
      const appts = apptsByLead.get(l._id.toString()) ?? [];
      const lastCompleted = appts.find(a => a.status === "completed");
      return {
        kind: "lead",
        id: l._id.toString(),
        name: l.name,
        phone: l.phone,
        email: l.email,
        age: l.age,
        gender: l.gender,
        status: l.status,
        outcomeRating: l.outcomeRating,
        lastAppointmentDate: lastCompleted?.date ?? appts[0]?.date ?? null,
        appointmentsCount: appts.length,
        hasFeedback: feedbackByLead.has(l._id.toString()),
        source: l.source,
        createdAt: l.createdAt,
      };
    });

    const orphanRows: PatientRow[] = orphanAppointments.map(a => ({
      kind: "direct",
      id: a._id.toString(),
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
      const ad = a.lastAppointmentDate
        ? new Date(a.lastAppointmentDate).getTime()
        : 0;
      const bd = b.lastAppointmentDate
        ? new Date(b.lastAppointmentDate).getTime()
        : 0;
      return bd - ad;
    });

    return NextResponse.json({ patients: all });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
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

    const lead = await Lead.create({
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
      createdBy: user.id,
    });

    return NextResponse.json({ patient: lead }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
