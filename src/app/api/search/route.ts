import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { getUser } from "@/middleware/auth";
import { withClientFilter } from "@/lib/query";
import { canonicalPhone } from "@/lib/phone";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

const PER_GROUP = 5;

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

    const scope = withClientFilter(user) as { clientId?: string };
    const phoneNorm = canonicalPhone(q);

    // Prisma `contains` performs LIKE %q%. MySQL's default
    // utf8mb4_unicode_ci collation is case-insensitive, so we don't need
    // the `mode: "insensitive"` flag (Postgres-only).
    const leadOR: Prisma.LeadWhereInput[] = [
      { name: { contains: q } },
      { phone: { contains: q } },
      { email: { contains: q } },
    ];
    if (phoneNorm.length >= 4) {
      leadOR.push({ phoneNormalized: { contains: phoneNorm } });
    }

    const apptOR: Prisma.AppointmentWhereInput[] = [
      { name: { contains: q } },
      { phone: { contains: q } },
      { email: { contains: q } },
      { diagnosis: { contains: q } },
    ];

    const fbOR: Prisma.FeedbackWhereInput[] = [
      { clientName: { contains: q } },
      { clientPhone: { contains: q } },
      { reviewText: { contains: q } },
    ];

    const [leadsRaw, apptsRaw, feedbacksRaw] = await Promise.all([
      hasModule(user, "leads") || hasModule(user, "patients")
        ? prisma.lead.findMany({
            where: { ...scope, OR: leadOR },
            select: {
              id: true,
              name: true,
              phone: true,
              status: true,
              source: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: PER_GROUP * 2,
          })
        : Promise.resolve([]),
      hasModule(user, "appointments")
        ? prisma.appointment.findMany({
            where: { ...scope, OR: apptOR },
            select: {
              id: true,
              name: true,
              phone: true,
              date: true,
              status: true,
              diagnosis: true,
            },
            orderBy: { date: "desc" },
            take: PER_GROUP,
          })
        : Promise.resolve([]),
      hasModule(user, "feedback")
        ? prisma.feedback.findMany({
            where: { ...scope, OR: fbOR },
            select: {
              id: true,
              clientName: true,
              clientPhone: true,
              rating: true,
              reviewText: true,
              status: true,
              submittedAt: true,
            },
            orderBy: { submittedAt: "desc" },
            take: PER_GROUP,
          })
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
        id: l.id,
        name: l.name,
        phone: l.phone,
        status: l.status,
        source: l.source,
      })),
      patients: patientsHits.map(l => ({
        id: l.id,
        name: l.name,
        phone: l.phone,
        status: l.status,
      })),
      appointments: apptsRaw.map(a => ({
        id: a.id,
        name: a.name,
        phone: a.phone,
        date: a.date,
        status: a.status,
        diagnosis: a.diagnosis,
      })),
      feedbacks: feedbacksRaw.map(f => ({
        id: f.id,
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
