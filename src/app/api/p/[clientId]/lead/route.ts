import { createLead } from "@/repos/lead";
import { resolveClientByPublicIdentifier } from "@/lib/public-client";
import { generateFeedbackToken, buildFeedbackUrl } from "@/lib/feedback-token";
import { getErrorMessage } from "@/lib/errors";
import { logAudit } from "@/lib/audit";
import { NextResponse } from "next/server";
import { z } from "zod";

const publicProfileLeadSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(10).max(40),
  message: z.string().trim().max(2000).optional(),
  source: z.string().trim().max(120).optional(),
});

type RouteContext = { params: Promise<{ clientId: string }> };

export async function POST(req: Request, ctx: RouteContext) {
  try {
    const { clientId } = await ctx.params;

    const client = await resolveClientByPublicIdentifier(clientId);
    // profile is a Json column; cast for the enabled check.
    const profile = client?.profile as { enabled?: boolean } | null | undefined;
    if (!profile?.enabled) {
      return NextResponse.json({ error: "Page not active" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = publicProfileLeadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const lead = await createLead({
      name: parsed.data.name,
      phone: parsed.data.phone,
      notes: parsed.data.message ?? "",
      source: parsed.data.source ?? "website-profile",
      status: "new",
      statusUpdatedAt: new Date(),
      feedbackToken: generateFeedbackToken(),
      clientId: client!.id,
    });

    await logAudit(
      req,
      { actorType: "public", source: "profile-form", clientId: client!.id },
      {
        action: "lead.created",
        entityType: "Lead",
        entityId: lead.id,
        entityLabel: lead.name,
        summary: "Lead submitted from public profile",
        metadata: { phone: lead.phone, source: lead.source },
      },
    );

    const origin = req.headers.get("origin") ?? new URL(req.url).origin;

    return NextResponse.json(
      {
        leadId: lead.id,
        feedbackUrl: lead.feedbackToken
          ? buildFeedbackUrl(origin, lead.feedbackToken)
          : null,
      },
      { status: 201 },
    );
  } catch (err: unknown) {
    console.error("[p/lead] failed:", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
