import { prisma } from "@/lib/prisma";
import { getClientByWebhookKey } from "@/lib/webhook-auth";
import { canonicalPhone } from "@/lib/phone";
import { getErrorMessage } from "@/lib/errors";
import { logAudit } from "@/lib/audit";
import { NextResponse } from "next/server";

// Cal.com booking payloads carry attendees on `payload.attendees` and may
// duplicate the same fields in `payload.responses` (the booker form). We try
// both, plus a label-based fallback for the phone field since the Cal.com
// custom-question key isn't always literally "phone".
type CalAttendee = {
  name?: string;
  email?: string;
  phoneNumber?: string | null;
};
type CalResponse = { label?: string; value?: unknown };

const stringValue = (v: unknown): string | undefined =>
  typeof v === "string" ? v : undefined;

const findPhoneFromResponses = (
  responses: Record<string, CalResponse> | undefined,
): string | undefined => {
  if (!responses) return undefined;
  const direct = stringValue(responses.phone?.value);
  if (direct) return direct;
  for (const r of Object.values(responses)) {
    if (typeof r?.label === "string" && /phone/i.test(r.label)) {
      const v = stringValue(r.value);
      if (v) return v;
    }
  }
  return undefined;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const triggerEvent = body?.triggerEvent;

    // Only act on new bookings. BOOKING_RESCHEDULED / BOOKING_CANCELLED and
    // friends are ignored for now — easy to extend later by branching on
    // triggerEvent here.
    // TODO: handle BOOKING_RESCHEDULED to update Appointment.date and
    // BOOKING_CANCELLED to flip status to "cancelled".
    if (triggerEvent !== "BOOKING_CREATED") {
      return NextResponse.json({ message: "ignored" });
    }

    const { client, reason } = await getClientByWebhookKey(req);
    if (!client) {
      const status = reason === "missing-key" ? 401 : 404;
      return NextResponse.json(
        {
          error:
            reason === "missing-key"
              ? "Missing webhook key"
              : "Client not found",
        },
        { status },
      );
    }

    const payload = body?.payload ?? {};
    const attendee: CalAttendee = payload.attendees?.[0] ?? {};
    const responses = payload.responses as
      | Record<string, CalResponse>
      | undefined;

    const name =
      attendee.name ?? stringValue(responses?.name?.value) ?? undefined;
    const email =
      attendee.email ?? stringValue(responses?.email?.value) ?? undefined;
    const phone =
      attendee.phoneNumber ?? findPhoneFromResponses(responses);
    const startTime = payload.startTime;

    let leadId: string | null = null;
    if (phone) {
      const norm = canonicalPhone(phone);
      if (norm.length >= 10) {
        const lead = await prisma.lead.findFirst({
          where: { clientId: client.id, phoneNormalized: norm },
        });
        if (lead) {
          leadId = lead.id;
          if (lead.status !== "visited" && lead.status !== "lost") {
            await prisma.lead.update({
              where: { id: lead.id },
              data: {
                status: "appointment_booked",
                statusUpdatedAt: new Date(),
              },
            });
          }
        }
      }
    }

    const appointment = await prisma.appointment.create({
      data: {
        name,
        email,
        phone,
        date: startTime ? new Date(startTime) : null,
        clientId: client.id,
        leadId,
        source: "cal.com",
        notes: "",
        diagnosis: "",
        medicines: [],
      },
    });

    const apptLabel = appointment.date
      ? `${name ?? "Unnamed"} · ${new Date(appointment.date).toLocaleString()}`
      : name ?? "Unnamed";
    await logAudit(
      req,
      { actorType: "webhook", source: "cal.com", clientId: client.id },
      {
        action: "appointment.created",
        entityType: "Appointment",
        entityId: appointment.id,
        entityLabel: apptLabel,
        summary: leadId
          ? "Cal.com booking created (matched to patient)"
          : "Cal.com booking created (orphan — no phone match)",
        metadata: { phone, leadMatched: !!leadId },
      },
    );

    return NextResponse.json({ appointment });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
