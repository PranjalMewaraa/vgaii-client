import { connectDB } from "@/lib/db";
import Lead from "@/models/Lead";
import Appointment from "@/models/Appointment";
import Feedback from "@/models/Feedback";
import { getUser } from "@/middleware/auth";
import { withClientFilter } from "@/lib/query";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

type PatientRow = {
  kind: "lead" | "direct";
  id: string;
  name: string;
  phone: string;
  status?: string;
  outcomeRating?: number;
  lastAppointmentDate?: Date | null;
  appointmentsCount: number;
  hasFeedback: boolean;
  source?: string;
};

export async function GET(req: Request) {
  try {
    await connectDB();
    const user = getUser(req);
    const filter = withClientFilter(user);

    const [leads, orphanAppointments, feedbacks] = await Promise.all([
      Lead.find(filter).lean(),
      Appointment.find({ ...filter, leadId: { $in: [null, undefined] } }).lean(),
      Feedback.find(filter).select("leadId").lean(),
    ]);

    const feedbackByLead = new Set(
      feedbacks.map(f => f.leadId?.toString()).filter(Boolean) as string[],
    );

    const leadIds = leads.map(l => l._id);
    const apptsForLeads = await Appointment.find({
      ...filter,
      leadId: { $in: leadIds },
    })
      .sort({ date: -1 })
      .lean();

    const apptsByLead = new Map<string, typeof apptsForLeads>();
    for (const a of apptsForLeads) {
      const key = a.leadId?.toString();
      if (!key) continue;
      const arr = apptsByLead.get(key) ?? [];
      arr.push(a);
      apptsByLead.set(key, arr);
    }

    const leadRows: PatientRow[] = leads
      .filter(l => apptsByLead.has(l._id.toString()) || l.status === "appointment_booked" || l.status === "visited")
      .map(l => {
        const appts = apptsByLead.get(l._id.toString()) ?? [];
        return {
          kind: "lead" as const,
          id: l._id.toString(),
          name: l.name,
          phone: l.phone,
          status: l.status,
          outcomeRating: l.outcomeRating,
          lastAppointmentDate: appts[0]?.date ?? null,
          appointmentsCount: appts.length,
          hasFeedback: feedbackByLead.has(l._id.toString()),
          source: l.source,
        };
      });

    const orphanRows: PatientRow[] = orphanAppointments.map(a => ({
      kind: "direct" as const,
      id: a._id.toString(),
      name: a.name ?? "Unnamed",
      phone: a.phone ?? "",
      lastAppointmentDate: a.date ?? null,
      appointmentsCount: 1,
      hasFeedback: false,
      source: a.source,
    }));

    const all = [...leadRows, ...orphanRows].sort((a, b) => {
      const ad = a.lastAppointmentDate ? new Date(a.lastAppointmentDate).getTime() : 0;
      const bd = b.lastAppointmentDate ? new Date(b.lastAppointmentDate).getTime() : 0;
      return bd - ad;
    });

    return NextResponse.json({ patients: all });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
