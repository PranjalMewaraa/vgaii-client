import { prisma } from "@/lib/prisma";
import { getUser } from "@/middleware/auth";
import { withClientFilter } from "@/lib/query";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: RouteContext) {
  try {
    const user = getUser(req);
    const { id } = await ctx.params;
    const scope = withClientFilter(user) as { clientId?: string };

    const lead = await prisma.lead.findFirst({ where: { id, ...scope } });

    if (lead) {
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
        kind: "lead",
        lead,
        appointments,
        feedbacks,
        bookingUrl: client?.bookingUrl ?? null,
      });
    }

    // Direct (orphan) appointment fallback — used when an appointment
    // doesn't have a matching Lead (e.g. Cal.com booking with no
    // matchable phone).
    const appt = await prisma.appointment.findFirst({
      where: { id, ...scope, leadId: null },
    });

    if (!appt) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    return NextResponse.json({
      kind: "direct",
      appointment: appt,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
