import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { getUser } from "@/middleware/auth";
import { checkRole, checkModule } from "@/lib/rbac";
import { withClientFilter } from "@/lib/query";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const user = getUser(req);
    checkRole(user, ["CLIENT_ADMIN", "STAFF"]);
    checkModule(user, "appointments");

    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("search")?.trim();
    const fromParam = url.searchParams.get("from");
    const toParam = url.searchParams.get("to");

    const where: Prisma.AppointmentWhereInput = withClientFilter(
      user,
    ) as Prisma.AppointmentWhereInput;
    if (status) {
      where.status = status as Prisma.AppointmentWhereInput["status"];
    }
    if (fromParam || toParam) {
      const dateFilter: { gte?: Date; lte?: Date } = {};
      if (fromParam && !Number.isNaN(Date.parse(fromParam))) {
        dateFilter.gte = new Date(fromParam);
      }
      if (toParam && !Number.isNaN(Date.parse(toParam))) {
        dateFilter.lte = new Date(toParam);
      }
      if (Object.keys(dateFilter).length > 0) where.date = dateFilter;
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const appointments = await prisma.appointment.findMany({
      where,
      orderBy: { date: "asc" },
    });

    return NextResponse.json({ appointments });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
