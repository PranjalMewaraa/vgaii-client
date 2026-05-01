import { connectDB } from "@/lib/db";
import Appointment from "@/models/Appointment";
import { getUser } from "@/middleware/auth";
import { checkRole, checkModule } from "@/lib/rbac";
import { withClientFilter } from "@/lib/query";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function GET(req: Request) {
  try {
    await connectDB();
    const user = getUser(req);
    checkRole(user, ["CLIENT_ADMIN", "STAFF"]);
    checkModule(user, "appointments");

    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("search")?.trim();
    const fromParam = url.searchParams.get("from");
    const toParam = url.searchParams.get("to");

    const filter: Record<string, unknown> = withClientFilter(user);
    if (status) filter.status = status;
    if (fromParam || toParam) {
      const dateFilter: Record<string, Date> = {};
      if (fromParam && !Number.isNaN(Date.parse(fromParam))) {
        dateFilter.$gte = new Date(fromParam);
      }
      if (toParam && !Number.isNaN(Date.parse(toParam))) {
        dateFilter.$lte = new Date(toParam);
      }
      if (Object.keys(dateFilter).length > 0) filter.date = dateFilter;
    }
    if (search) {
      const re = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ name: re }, { phone: re }, { email: re }];
    }

    const appointments = await Appointment.find(filter).sort({ date: 1 }).lean();
    return NextResponse.json({ appointments });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
