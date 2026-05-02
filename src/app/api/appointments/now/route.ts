import { connectDB } from "@/lib/db";
import Appointment from "@/models/Appointment";
import { getUser } from "@/middleware/auth";
import { checkRole, checkModule } from "@/lib/rbac";
import { withClientFilter } from "@/lib/query";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

// "Active" = a scheduled appointment whose start time is within ±30 minutes
// of right now. Anything past that range is either a future appointment
// ("next") or already over and waiting to be marked visited.
const ACTIVE_WINDOW_MS = 30 * 60 * 1000;

export async function GET(req: Request) {
  try {
    await connectDB();
    const user = getUser(req);
    checkRole(user, ["CLIENT_ADMIN", "STAFF"]);
    checkModule(user, "appointments");

    const filter = withClientFilter(user);
    const now = Date.now();

    const [active, next] = await Promise.all([
      Appointment.findOne({
        ...filter,
        status: "scheduled",
        date: {
          $gte: new Date(now - ACTIVE_WINDOW_MS),
          $lte: new Date(now + ACTIVE_WINDOW_MS),
        },
      })
        .sort({ date: 1 })
        .lean(),
      Appointment.findOne({
        ...filter,
        status: "scheduled",
        date: { $gt: new Date(now + ACTIVE_WINDOW_MS) },
      })
        .sort({ date: 1 })
        .lean(),
    ]);

    return NextResponse.json({ active, next });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
