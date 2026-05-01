import { connectDB } from "@/lib/db";
import Appointment from "@/models/Appointment";
import Lead from "@/models/Lead";
import { getClientByWebhookKey } from "@/lib/webhook-auth";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

const normalizePhone = (phone?: string) =>
  phone ? phone.replace(/[^\d]/g, "").slice(-10) : "";

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();
    const event = body.event;
    const payload = body.payload ?? {};

    if (event !== "invitee.created") {
      return NextResponse.json({ message: "ignored" });
    }

    const { client, reason } = await getClientByWebhookKey(req);
    if (!client) {
      const status = reason === "missing-key" ? 401 : 404;
      return NextResponse.json(
        { error: reason === "missing-key" ? "Missing webhook key" : "Client not found" },
        { status },
      );
    }

    const phone = payload.phone ?? payload.text_reminder_number ?? payload.mobile;

    let leadId: unknown = null;
    if (phone) {
      const norm = normalizePhone(phone);
      if (norm) {
        const lead = await Lead.findOne({
          clientId: client._id,
          phone: { $regex: `${norm}$` },
        });
        if (lead) {
          leadId = lead._id;
          if (lead.status !== "visited" && lead.status !== "lost") {
            lead.status = "appointment_booked";
            lead.statusUpdatedAt = new Date();
            await lead.save();
          }
        }
      }
    }

    const appointment = await Appointment.create({
      name: payload.name,
      email: payload.email,
      phone,
      date: payload.event_start_time,
      clientId: client._id,
      leadId,
      source: "calendly",
    });

    return NextResponse.json({ appointment });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
