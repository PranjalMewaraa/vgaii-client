import { createLead } from "@/repos/lead";
import { getClientByWebhookKey } from "@/lib/webhook-auth";
import { publicLeadSchema } from "@/lib/validators/lead";
import { generateFeedbackToken, buildFeedbackUrl } from "@/lib/feedback-token";
import { getErrorMessage } from "@/lib/errors";
import { logAudit } from "@/lib/audit";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { client, reason } = await getClientByWebhookKey(req);
    if (!client) {
      const status = reason === "missing-key" ? 401 : 404;
      return NextResponse.json(
        { error: reason === "missing-key" ? "Missing webhook key" : "Invalid webhook key" },
        { status },
      );
    }

    const body = await req.json();
    const parsed = publicLeadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const lead = await createLead({
      ...parsed.data,
      // publicLeadSchema doesn't accept a notes input; default to "" so
      // the NOT NULL column is satisfied.
      notes: "",
      clientId: client.id,
      feedbackToken: generateFeedbackToken(),
      status: "new",
      statusUpdatedAt: new Date(),
    });

    await logAudit(
      req,
      { actorType: "webhook", source: "lead-webhook", clientId: client.id },
      {
        action: "lead.created",
        entityType: "Lead",
        entityId: lead.id,
        entityLabel: lead.name,
        summary: "Lead created via webhook",
        metadata: { phone: lead.phone, source: lead.source },
      },
    );

    const origin = req.headers.get("origin") ?? new URL(req.url).origin;

    return NextResponse.json(
      {
        leadId: lead.id,
        status: lead.status,
        feedbackUrl: lead.feedbackToken
          ? buildFeedbackUrl(origin, lead.feedbackToken)
          : null,
      },
      { status: 201 },
    );
  } catch (err: unknown) {
    console.error("[webhooks/leads] failed:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
