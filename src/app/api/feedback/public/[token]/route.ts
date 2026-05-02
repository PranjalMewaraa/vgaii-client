import { connectDB } from "@/lib/db";
import Lead from "@/models/Lead";
import Feedback from "@/models/Feedback";
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
    await connectDB();
    const { token } = await ctx.params;

    const lead = await Lead.findOne({ feedbackToken: token });
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
    await connectDB();
    const { token } = await ctx.params;

    const lead = await Lead.findOne({ feedbackToken: token });
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

    const fb = await Feedback.create({
      clientId: lead.clientId,
      leadId: lead._id,
      clientName: lead.name,
      clientPhone: lead.phone,
      rating: parsed.data.rating,
      reviewText: parsed.data.reviewText,
      status: "open",
      submittedAt,
    });

    lead.feedbackTokenUsed = true;
    lead.outcomeRating = parsed.data.rating;
    if (lead.status !== "lost") {
      lead.status = "visited";
      lead.statusUpdatedAt = submittedAt;
    }
    await lead.save();

    await logAudit(
      req,
      { actorType: "public", source: "feedback-link", clientId: lead.clientId.toString() },
      {
        action: "feedback.submitted",
        entityType: "Feedback",
        entityId: fb._id.toString(),
        entityLabel: lead.name,
        summary: `Feedback submitted (${parsed.data.rating}/5)`,
        metadata: { rating: parsed.data.rating, leadId: lead._id.toString() },
      },
    );

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("[feedback/token] submit failed:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
