import { connectDB } from "@/lib/db";
import Lead from "@/models/Lead";
import Appointment from "@/models/Appointment";
import Feedback from "@/models/Feedback";
import { getUser } from "@/middleware/auth";
import { withClientFilter } from "@/lib/query";
import { canonicalPhone } from "@/lib/phone";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

const PER_GROUP = 5;
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const PATIENT_STATUSES = ["qualified", "appointment_booked", "visited"];

const hasModule = (
  user: ReturnType<typeof getUser>,
  module: string,
): boolean => {
  if (user.role === "SUPER_ADMIN" || user.role === "CLIENT_ADMIN") return true;
  return user.assignedModules?.includes(module) ?? false;
};

export async function GET(req: Request) {
  try {
    await connectDB();
    const user = getUser(req);

    const q = new URL(req.url).searchParams.get("q")?.trim();
    if (!q || q.length < 2) {
      return NextResponse.json({
        leads: [],
        patients: [],
        appointments: [],
        feedbacks: [],
      });
    }

    const filter = withClientFilter(user);
    const re = new RegExp(escapeRegex(q), "i");
    const phoneNorm = canonicalPhone(q);
    const phoneFilter =
      phoneNorm.length >= 4 ? { phoneNormalized: { $regex: phoneNorm } } : null;

    // Build the contact-match $or once: name/phone for Leads + Appointments,
    // clientName/clientPhone for Feedback.
    const leadOr: Record<string, unknown>[] = [
      { name: re },
      { phone: re },
      { email: re },
    ];
    if (phoneFilter) leadOr.push(phoneFilter);

    const apptOr: Record<string, unknown>[] = [
      { name: re },
      { phone: re },
      { email: re },
      { diagnosis: re },
    ];

    const fbOr: Record<string, unknown>[] = [
      { clientName: re },
      { clientPhone: re },
      { reviewText: re },
    ];

    const [leadsRaw, apptsRaw, feedbacksRaw] = await Promise.all([
      hasModule(user, "leads") || hasModule(user, "patients")
        ? Lead.find({ ...filter, $or: leadOr })
            .select("_id name phone status source createdAt")
            .sort({ createdAt: -1 })
            .limit(PER_GROUP * 2)
            .lean()
        : Promise.resolve([]),
      hasModule(user, "appointments")
        ? Appointment.find({ ...filter, $or: apptOr })
            .select("_id name phone date status diagnosis")
            .sort({ date: -1 })
            .limit(PER_GROUP)
            .lean()
        : Promise.resolve([]),
      hasModule(user, "feedback")
        ? Feedback.find({ ...filter, $or: fbOr })
            .select("_id clientName clientPhone rating reviewText status submittedAt")
            .sort({ submittedAt: -1 })
            .limit(PER_GROUP)
            .lean()
        : Promise.resolve([]),
    ]);

    // Split leads into "leads" (pre-qualified) vs "patients" (qualified+)
    // so the dropdown groups make sense to the user.
    type LeadDoc = (typeof leadsRaw)[number];
    const leadsHits: LeadDoc[] = [];
    const patientsHits: LeadDoc[] = [];
    for (const l of leadsRaw) {
      const isPatient = PATIENT_STATUSES.includes(l.status ?? "");
      if (isPatient && hasModule(user, "patients") && patientsHits.length < PER_GROUP) {
        patientsHits.push(l);
      } else if (!isPatient && hasModule(user, "leads") && leadsHits.length < PER_GROUP) {
        leadsHits.push(l);
      }
    }

    return NextResponse.json({
      leads: leadsHits.map(l => ({
        id: l._id.toString(),
        name: l.name,
        phone: l.phone,
        status: l.status,
        source: l.source,
      })),
      patients: patientsHits.map(l => ({
        id: l._id.toString(),
        name: l.name,
        phone: l.phone,
        status: l.status,
      })),
      appointments: apptsRaw.map(a => ({
        id: a._id.toString(),
        name: a.name,
        phone: a.phone,
        date: a.date,
        status: a.status,
        diagnosis: a.diagnosis,
      })),
      feedbacks: feedbacksRaw.map(f => ({
        id: f._id.toString(),
        clientName: f.clientName,
        clientPhone: f.clientPhone,
        rating: f.rating,
        reviewText: f.reviewText,
        status: f.status,
      })),
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
