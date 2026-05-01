import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Client from "@/models/Client";
import Lead from "@/models/Lead";
import { generateFeedbackToken, buildFeedbackUrl } from "@/lib/feedback-token";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";
import { z } from "zod";

// Public — clientId in the URL acts as the page identifier. The page itself
// must be enabled for submissions to succeed.
const publicProfileLeadSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(10).max(40),
  message: z.string().trim().max(2000).optional(),
});

type RouteContext = { params: Promise<{ clientId: string }> };

export async function POST(req: Request, ctx: RouteContext) {
  try {
    await connectDB();
    const { clientId } = await ctx.params;

    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      return NextResponse.json({ error: "Invalid client" }, { status: 404 });
    }

    const client = await Client.findById(clientId).select("profile").lean<{
      profile?: { enabled?: boolean };
    }>();

    if (!client?.profile?.enabled) {
      return NextResponse.json({ error: "Page not active" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = publicProfileLeadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const lead = await Lead.create({
      name: parsed.data.name,
      phone: parsed.data.phone,
      notes: parsed.data.message ?? "",
      source: "website-profile",
      status: "new",
      statusUpdatedAt: new Date(),
      feedbackToken: generateFeedbackToken(),
      clientId,
    });

    const origin = req.headers.get("origin") ?? new URL(req.url).origin;

    return NextResponse.json(
      {
        leadId: lead._id,
        feedbackUrl: buildFeedbackUrl(origin, lead.feedbackToken),
      },
      { status: 201 },
    );
  } catch (err: unknown) {
    console.error("[p/lead] failed:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
