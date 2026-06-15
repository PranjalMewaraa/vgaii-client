import { prisma } from "@/lib/prisma";
import { getUser } from "@/middleware/auth";
import { checkRole, checkModule } from "@/lib/rbac";
import { withClientFilter } from "@/lib/query";
import {
  getBookingConfig,
  computeSlots,
  zonedWallTimeToUtc,
} from "@/lib/booking";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Free/booked slots for a clinic-local date. Authenticated (appointments
// module) — not public in v1.
export async function GET(req: Request) {
  try {
    const user = getUser(req);
    checkRole(user, ["CLIENT_ADMIN", "STAFF"]);
    checkModule(user, "appointments");
    if (!user.clientId) {
      return NextResponse.json({ error: "No client context" }, { status: 400 });
    }

    const date = new URL(req.url).searchParams.get("date")?.trim() ?? "";
    if (!DATE_RE.test(date)) {
      return NextResponse.json(
        { error: "Provide ?date=YYYY-MM-DD" },
        { status: 400 },
      );
    }

    const client = await prisma.client.findUnique({
      where: { id: user.clientId },
      select: { bookingConfig: true },
    });
    const config = getBookingConfig(client?.bookingConfig);
    if (!config.enabled) {
      return NextResponse.json({ enabled: false, slots: [] });
    }

    // Fetch scheduled appts whose start falls within the clinic-local day,
    // padded 24h back so a long appt starting late the previous day still
    // counts toward overlap.
    const dayStart = zonedWallTimeToUtc(date, "00:00", config.timezone);
    const dayEnd = new Date(dayStart.getTime() + 86_400_000);
    const scope = withClientFilter(user) as { clientId?: string };
    const appts = await prisma.appointment.findMany({
      where: {
        ...scope,
        status: "scheduled",
        date: {
          gte: new Date(dayStart.getTime() - 86_400_000),
          lt: dayEnd,
        },
      },
      select: { date: true, durationMin: true },
    });

    const existing = appts
      .filter(a => a.date)
      .map(a => ({ startUtc: a.date as Date, durationMin: a.durationMin }));

    const slots = computeSlots(config, date, existing);

    return NextResponse.json({
      enabled: true,
      date,
      timezone: config.timezone,
      slotMinutes: config.slotMinutes,
      slots,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
