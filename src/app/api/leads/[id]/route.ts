import { prisma } from "@/lib/prisma";
import { updateLead } from "@/repos/lead";
import { getUser } from "@/middleware/auth";
import { checkRole, checkModule } from "@/lib/rbac";
import { withClientFilter } from "@/lib/query";
import { leadUpdateSchema } from "@/lib/validators/lead";
import { canTransition, type LeadStatus } from "@/lib/constants";
import { getErrorMessage } from "@/lib/errors";
import { logAudit } from "@/lib/audit";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: RouteContext) {
  try {
    const user = getUser(req);
    checkRole(user, ["CLIENT_ADMIN", "STAFF"]);
    checkModule(user, "leads");

    const { id } = await ctx.params;
    const scope = withClientFilter(user) as { clientId?: string };

    const lead = await prisma.lead.findFirst({ where: { id, ...scope } });
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const [appointments, feedbacks, client] = await Promise.all([
      prisma.appointment.findMany({
        where: { ...scope, leadId: lead.id },
        orderBy: { date: "desc" },
      }),
      prisma.feedback.findMany({
        where: { ...scope, leadId: lead.id },
        orderBy: { createdAt: "desc" },
      }),
      user.clientId
        ? prisma.client.findUnique({
            where: { id: user.clientId },
            select: { bookingUrl: true },
          })
        : null,
    ]);

    return NextResponse.json({
      lead,
      appointments,
      feedbacks,
      bookingUrl: client?.bookingUrl ?? null,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: RouteContext) {
  try {
    const user = getUser(req);
    checkRole(user, ["CLIENT_ADMIN", "STAFF"]);
    checkModule(user, "leads");

    const { id } = await ctx.params;
    const scope = withClientFilter(user) as { clientId?: string };

    const body = await req.json();
    const parsed = leadUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const lead = await prisma.lead.findFirst({
      where: { id, ...(scope as { clientId?: string }) },
    });
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const prevStatus = lead.status as LeadStatus;
    const prevNotes = lead.notes ?? "";
    const prevRating = lead.outcomeRating;
    const prevName = lead.name;

    const data: Record<string, unknown> = {};
    if (parsed.data.status !== undefined) {
      const to = parsed.data.status;
      if (!canTransition(prevStatus, to)) {
        return NextResponse.json(
          {
            error: `Status cannot move from "${prevStatus}" to "${to}". Allowed next steps follow the lead workflow.`,
          },
          { status: 400 },
        );
      }
      data.status = to;
      data.statusUpdatedAt = new Date();
    }
    if (parsed.data.notes !== undefined) data.notes = parsed.data.notes;
    if (parsed.data.outcomeRating !== undefined) {
      data.outcomeRating = parsed.data.outcomeRating;
    }
    // Profile edits from the patient detail page. Empty strings on
    // optional columns become null so the DB stays consistent with the
    // "absent" semantics the rest of the app uses (e.g. age=null vs 0).
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.email !== undefined) {
      data.email = parsed.data.email === "" ? null : parsed.data.email;
    }
    if (parsed.data.age !== undefined) data.age = parsed.data.age;
    if (parsed.data.gender !== undefined) {
      data.gender = parsed.data.gender === "" ? null : parsed.data.gender;
    }
    if (parsed.data.area !== undefined) {
      data.area = parsed.data.area === "" ? null : parsed.data.area;
    }

    // updateLead pre-computes phoneNormalized when phone is in `data` —
    // it isn't here (PATCH doesn't allow phone changes), but routing
    // through the helper keeps the invariant centralised.
    const updated = await updateLead({ id: lead.id }, data);

    if (parsed.data.status !== undefined && parsed.data.status !== prevStatus) {
      await logAudit(req, { actorType: "user", user }, {
        action: "lead.status.changed",
        entityType: "Lead",
        entityId: updated.id,
        entityLabel: updated.name,
        summary: `Status: ${prevStatus} → ${parsed.data.status}`,
        metadata: { from: prevStatus, to: parsed.data.status },
      });
    }
    if (parsed.data.notes !== undefined && parsed.data.notes !== prevNotes) {
      await logAudit(req, { actorType: "user", user }, {
        action: "lead.notes.updated",
        entityType: "Lead",
        entityId: updated.id,
        entityLabel: updated.name,
        summary: "Notes updated",
      });
    }
    if (
      parsed.data.outcomeRating !== undefined &&
      parsed.data.outcomeRating !== prevRating
    ) {
      await logAudit(req, { actorType: "user", user }, {
        action: "lead.outcomeRating.updated",
        entityType: "Lead",
        entityId: updated.id,
        entityLabel: updated.name,
        summary: `Outcome rating: ${prevRating ?? "—"} → ${parsed.data.outcomeRating}`,
      });
    }

    // One audit entry covers all profile edits — the receptionist usually
    // touches a couple of fields at once, and a row per field would clutter
    // the activity feed.
    const profileFieldsTouched =
      parsed.data.name !== undefined ||
      parsed.data.email !== undefined ||
      parsed.data.age !== undefined ||
      parsed.data.gender !== undefined ||
      parsed.data.area !== undefined;
    if (profileFieldsTouched) {
      const summary = parsed.data.name && parsed.data.name !== prevName
        ? `Profile updated (renamed: ${prevName} → ${parsed.data.name})`
        : "Profile updated";
      await logAudit(req, { actorType: "user", user }, {
        action: "lead.profile.updated",
        entityType: "Lead",
        entityId: updated.id,
        entityLabel: updated.name,
        summary,
      });
    }

    return NextResponse.json({ lead: updated });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
