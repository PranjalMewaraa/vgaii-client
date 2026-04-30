import { connectDB } from "@/lib/db";
import Appointment from "@/models/Appointment";
import { getUser } from "@/middleware/auth";
import { checkRole, checkModule } from "@/lib/rbac";
import { withClientFilter } from "@/lib/query";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    await connectDB();

    const user = getUser(req);

    checkRole(user, ["CLIENT_ADMIN", "STAFF"]);
    checkModule(user, "appointments");

    const appointments = await Appointment.find(
      withClientFilter(user)
    ).sort({ date: 1 });

    return NextResponse.json({ appointments });

  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
