import { connectDB } from "@/lib/db";
import Lead from "@/models/Lead";
import { getClientByWebhookKey } from "@/lib/webhook-auth";
import { leadStatusSchema } from "@/lib/validators/lead";
import { canonicalPhone } from "@/lib/phone";
import { getErrorMessage } from "@/lib/errors";
import { logAudit } from "@/lib/audit";
import { NextResponse } from "next/server";

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

    const norm = canonicalPhone(parsed.data.phone);
    if (norm.length < 10) {
      return NextResponse.json({ error: "Invalid phone" }, { status: 400 });
    }

    const lead = await Lead.findOne({
      clientId: client._id,
      phoneNormalized: norm,
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const prevStatus = lead.status;
    lead.status = parsed.data.status;
    lead.statusUpdatedAt = new Date();
    if (parsed.data.outcomeRating !== undefined) {
      lead.outcomeRating = parsed.data.outcomeRating;
    }

    await lead.save();

    await logAudit(
      req,
      { actorType: "webhook", source: "status-webhook", clientId: client._id.toString() },
      {
        action: "lead.status.changed",
        entityType: "Lead",
        entityId: lead._id.toString(),
        entityLabel: lead.name,
        summary: `Status: ${prevStatus} → ${parsed.data.status} (via webhook)`,
        metadata: { from: prevStatus, to: parsed.data.status, outcomeRating: parsed.data.outcomeRating },
      },
    );

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
