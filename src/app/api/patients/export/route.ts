import { connectDB } from "@/lib/db";
import Lead from "@/models/Lead";
import Appointment from "@/models/Appointment";
import { getUser } from "@/middleware/auth";
import { withClientFilter } from "@/lib/query";
import { serializeCsv } from "@/lib/csv";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

const PATIENT_LEAD_STATUSES = ["qualified", "appointment_booked", "visited"];

const CSV_HEADERS = [
  "name",
  "phone",
  "email",
  "age",
  "gender",
  "area",
  "source",
  "status",
  "outcomeRating",
  "createdAt",
  "lastAppointmentDate",
  "appointmentsCount",
  "notes",
];

const fmtDate = (d: Date | undefined | null) =>
  d ? new Date(d).toISOString() : "";

export async function GET(req: Request) {
  try {
    await connectDB();
    const user = getUser(req);
    const filter = withClientFilter(user);

    const leads = await Lead.find({
      ...filter,
      status: { $in: PATIENT_LEAD_STATUSES },
    }).lean();

    const leadIds = leads.map(l => l._id);
    const appts = leadIds.length
      ? await Appointment.find({ ...filter, leadId: { $in: leadIds } })
          .sort({ date: -1 })
          .lean()
      : [];

    const apptsByLead = new Map<string, typeof appts>();
    for (const a of appts) {
      const key = a.leadId?.toString();
      if (!key) continue;
      const arr = apptsByLead.get(key) ?? [];
      arr.push(a);
      apptsByLead.set(key, arr);
    }

    const rows = leads.map(l => {
      const list = apptsByLead.get(l._id.toString()) ?? [];
      const last = list.find(a => a.status === "completed") ?? list[0];
      return {
        name: l.name,
        phone: l.phone,
        email: l.email ?? "",
        age: l.age ?? "",
        gender: l.gender ?? "",
        area: l.area ?? "",
        source: l.source ?? "",
        status: l.status ?? "",
        outcomeRating: l.outcomeRating ?? "",
        createdAt: fmtDate(l.createdAt),
        lastAppointmentDate: fmtDate(last?.date),
        appointmentsCount: list.length,
        notes: l.notes ?? "",
      };
    });

    const csv = serializeCsv(CSV_HEADERS, rows);
    const filename = `patients-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
