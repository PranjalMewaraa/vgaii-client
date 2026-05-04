import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { getUser } from "@/middleware/auth";
import { withClientFilter } from "@/lib/query";
import { serializeCsv } from "@/lib/csv";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

const CSV_HEADERS = [
  "name",
  "phone",
  "email",
  "age",
  "gender",
  "area",
  "source",
  "status",
  "outcomeRating",
  "createdAt",
  "lastAppointmentDate",
  "appointmentsCount",
  "notes",
];

const fmtDate = (d: Date | undefined | null) =>
  d ? new Date(d).toISOString() : "";

export async function GET(req: Request) {
  try {
    const user = getUser(req);
    const scope = withClientFilter(user) as { clientId?: string };

    const idsParam = new URL(req.url).searchParams.get("ids");
    const ids = idsParam
      ? idsParam.split(",").map(s => s.trim()).filter(Boolean)
      : null;

    const where: Prisma.LeadWhereInput = {
      ...scope,
      status: { in: ["qualified", "appointment_booked", "visited"] },
    };
    if (ids && ids.length > 0) {
      where.id = { in: ids };
    }

    const leads = await prisma.lead.findMany({ where });

    const leadIds = leads.map(l => l.id);
    const appts = leadIds.length
      ? await prisma.appointment.findMany({
          where: { ...scope, leadId: { in: leadIds } },
          orderBy: { date: "desc" },
        })
      : [];

    const apptsByLead = new Map<string, typeof appts>();
    for (const a of appts) {
      if (!a.leadId) continue;
      const arr = apptsByLead.get(a.leadId) ?? [];
      arr.push(a);
      apptsByLead.set(a.leadId, arr);
    }

    const rows = leads.map(l => {
      const list = apptsByLead.get(l.id) ?? [];
      const last = list[0];
      return {
        name: l.name,
        phone: l.phone,
        email: l.email ?? "",
        age: l.age ?? "",
        gender: l.gender ?? "",
        area: l.area ?? "",
        source: l.source ?? "",
        status: l.status ?? "",
        outcomeRating: l.outcomeRating ?? "",
        createdAt: fmtDate(l.createdAt),
        lastAppointmentDate: fmtDate(last?.date),
        appointmentsCount: list.length,
        notes: l.notes ?? "",
      };
    });

    const csv = serializeCsv(CSV_HEADERS, rows);
    const filename = `patients-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
