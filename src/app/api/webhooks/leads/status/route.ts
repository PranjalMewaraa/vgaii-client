import { connectDB } from "@/lib/db";
import Lead from "@/models/Lead";
import { getClientByWebhookKey } from "@/lib/webhook-auth";
import { leadStatusSchema } from "@/lib/validators/lead";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

const normalizePhone = (phone: string) => phone.replace(/[^\d]/g, "").slice(-10);

export async function PATCH(req: Request) {
  try {
    await connectDB();

    const { client, reason } = await getClientByWebhookKey(req);
    if (!client) {
      const status = reason === "missing-key" ? 401 : 404;
      return NextResponse.json(
        { error: reason === "missing-key" ? "Missing webhook key" : "Invalid webhook key" },
        { status },
      );
    }

    const body = await req.json();
    const parsed = leadStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const norm = normalizePhone(parsed.data.phone);
    if (!norm) {
      return NextResponse.json({ error: "Invalid phone" }, { status: 400 });
    }

    const lead = await Lead.findOne({
      clientId: client._id,
      phone: { $regex: `${norm}$` },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    lead.status = parsed.data.status;
    lead.statusUpdatedAt = new Date();
    if (parsed.data.outcomeRating !== undefined) {
      lead.outcomeRating = parsed.data.outcomeRating;
    }

    await lead.save();

    return NextResponse.json({
      leadId: lead._id,
      status: lead.status,
      outcomeRating: lead.outcomeRating,
    });
  } catch (err: unknown) {
    console.error("[webhooks/leads/status] failed:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
