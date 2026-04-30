import { connectDB } from "@/lib/db";
import Appointment from "@/models/Appointment";
import Client from "@/models/Client";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();

    const event = body.event;
    const payload = body.payload;
    const webhookKey =
      req.headers.get("x-webhook-key") ||
      new URL(req.url).searchParams.get("key");

    if (event !== "invitee.created") {
      return NextResponse.json({ message: "ignored" });
    }

    if (!webhookKey) {
      return NextResponse.json({ error: "Missing webhook key" }, { status: 401 });
    }

    const client = await Client.findOne({
      calendlyWebhookKey: webhookKey,
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const appointment = await Appointment.create({
      name: payload.name,
      email: payload.email,
      date: payload.event_start_time,
      clientId: client._id,
    });

    return NextResponse.json({ appointment });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
