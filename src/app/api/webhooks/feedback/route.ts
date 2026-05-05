import { prisma } from "@/lib/prisma";
import { getClientByWebhookKey } from "@/lib/webhook-auth";
import { canonicalPhone } from "@/lib/phone";
import { getErrorMessage } from "@/lib/errors";
import { logAudit } from "@/lib/audit";
import { NextResponse } from "next/server";
import { z } from "zod";

// Webhook-driven feedback ingestion. Used by external survey tools, SMS
// providers, or custom landing pages that already collect a rating from
// the patient and want to push it back into the CRM.
//
// Difference from the public token flow (/api/feedback/public/[token]):
//   - This is webhook-key authenticated, not single-use-token gated.
//   - It accepts the full 1–5 range, not just 1–2.
//   - Phone match is optional — if the lead exists in the same client,
//     the feedback is linked to it; otherwise it's stored standalone with
//     clientName + clientPhone.
//
// Atomicity: when a matching lead exists, we update its outcomeRating and
// (for non-lost leads) flip status to "visited" alongside the feedback
// insert in a single transaction so partial state can't leak.
const feedbackWebhookSchema = z.object({
  phone: z.string().min(10),
  rating: z.number().int().min(1).max(5),
  reviewText: z.string().min(1).max(2000).optional(),
  // Internal note from the operator who collected the feedback. Stored
  // as `Feedback.remark` and never shown publicly.
  remark: z.string().min(1).max(2000).optional(),
  // Optional name passthrough for standalone feedbacks (no lead match).
  // Ignored when a lead match exists — Lead.name wins.
  name: z.string().min(1).max(200).optional(),
});

export async function POST(req: Request) {
  try {
    const { client, reason } = await getClientByWebhookKey(req);
    if (!client) {
      const status = reason === "missing-key" ? 401 : 404;
      return NextResponse.json(
        {
          error:
            reason === "missing-key"
              ? "Missing webhook key"
              : "Invalid webhook key",
        },
        { status },
      );
    }

    const body = await req.json();
    const parsed = feedbackWebhookSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const norm = canonicalPhone(parsed.data.phone);
    if (norm.length < 10) {
      return NextResponse.json({ error: "Invalid phone" }, { status: 400 });
    }

    const lead = await prisma.lead.findFirst({
      where: { clientId: client.id, phoneNormalized: norm },
    });

    const submittedAt = new Date();

    const feedback = await prisma.$transaction(async tx => {
      const created = await tx.feedback.create({
        data: {
          clientId: client.id,
          leadId: lead?.id ?? null,
          // When linked to a lead, copy its name/phone so the feedbacks
          // list renders correctly even if the Lead is later deleted.
          // When standalone, use whatever the webhook supplied.
          clientName: lead?.name ?? parsed.data.name ?? null,
          clientPhone: lead?.phone ?? parsed.data.phone,
          rating: parsed.data.rating,
          reviewText: parsed.data.reviewText,
          remark: parsed.data.remark,
          status: "open",
          submittedAt,
        },
      });

      // If we matched a lead and it's not already terminal, promote to
      // "visited" — this matches the public-token flow's behaviour and
      // keeps the funnel honest. We never demote `lost` leads.
      if (lead && lead.status !== "lost") {
        await tx.lead.update({
          where: { id: lead.id },
          data: {
            outcomeRating: parsed.data.rating,
            ...(lead.status !== "visited"
              ? { status: "visited", statusUpdatedAt: submittedAt }
              : {}),
          },
        });
      }

      return created;
    });

    await logAudit(
      req,
      { actorType: "webhook", source: "feedback-webhook", clientId: client.id },
      {
        action: "feedback.submitted",
        entityType: "Feedback",
        entityId: feedback.id,
        entityLabel: lead?.name ?? parsed.data.name ?? parsed.data.phone,
        summary: `Feedback submitted via webhook (${parsed.data.rating}/5)${lead ? "" : " — no lead match"}`,
        metadata: {
          rating: parsed.data.rating,
          phone: parsed.data.phone,
          leadMatched: !!lead,
          leadId: lead?.id,
        },
      },
    );

    return NextResponse.json(
      {
        feedbackId: feedback.id,
        leadId: lead?.id ?? null,
        leadMatched: !!lead,
        status: feedback.status,
      },
      { status: 201 },
    );
  } catch (err: unknown) {
    console.error("[webhooks/feedback] failed:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
