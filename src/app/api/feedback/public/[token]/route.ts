import { prisma } from "@/lib/prisma";
import { getErrorMessage } from "@/lib/errors";
import { logAudit } from "@/lib/audit";
import { NextResponse } from "next/server";
import { z } from "zod";

// Feedback flow is only for ratings below 3 — 3+ ratings are sent to Google
// reviews by the upstream flow and never reach this endpoint.
const feedbackSubmissionSchema = z.object({
  rating: z
    .number()
    .int()
    .refine(r => r === 1 || r === 2, {
      message: "Feedback only accepts ratings of 1 or 2",
    }),
  reviewText: z.string().min(1).max(2000).optional(),
});

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_req: Request, ctx: RouteContext) {
  try {
    const { token } = await ctx.params;

    // feedbackToken is sparse-unique on Lead, so findUnique is valid.
    const lead = await prisma.lead.findUnique({
      where: { feedbackToken: token },
      select: { name: true, phone: true, feedbackTokenUsed: true },
    });
    if (!lead) {
      return NextResponse.json({ error: "Invalid link" }, { status: 404 });
    }

    return NextResponse.json({
      name: lead.name,
      phone: lead.phone,
      tokenUsed: !!lead.feedbackTokenUsed,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: RouteContext) {
  try {
    const { token } = await ctx.params;

    const lead = await prisma.lead.findUnique({
      where: { feedbackToken: token },
    });
    if (!lead) {
      return NextResponse.json({ error: "Invalid link" }, { status: 404 });
    }
    if (lead.feedbackTokenUsed) {
      return NextResponse.json({ error: "Already submitted" }, { status: 410 });
    }

    const body = await req.json();
    const parsed = feedbackSubmissionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const submittedAt = new Date();

    // Two writes that should be atomic: feedback insert + lead status
    // update. If either fails we don't want a half-applied state.
    const fb = await prisma.$transaction(async tx => {
      const created = await tx.feedback.create({
        data: {
          clientId: lead.clientId,
          leadId: lead.id,
          clientName: lead.name,
          clientPhone: lead.phone,
          rating: parsed.data.rating,
          reviewText: parsed.data.reviewText,
          status: "open",
          submittedAt,
        },
      });

      await tx.lead.update({
        where: { id: lead.id },
        data: {
          feedbackTokenUsed: true,
          outcomeRating: parsed.data.rating,
          ...(lead.status !== "lost"
            ? { status: "visited", statusUpdatedAt: submittedAt }
            : {}),
        },
      });

      return created;
    });

    await logAudit(
      req,
      { actorType: "public", source: "feedback-link", clientId: lead.clientId },
      {
        action: "feedback.submitted",
        entityType: "Feedback",
        entityId: fb.id,
        entityLabel: lead.name,
        summary: `Feedback submitted (${parsed.data.rating}/5)`,
        metadata: { rating: parsed.data.rating, leadId: lead.id },
      },
    );

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("[feedback/token] submit failed:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
