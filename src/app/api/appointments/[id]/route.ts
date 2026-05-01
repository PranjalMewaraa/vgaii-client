import { connectDB } from "@/lib/db";
import Appointment from "@/models/Appointment";
import { getUser } from "@/middleware/auth";
import { checkRole, checkModule } from "@/lib/rbac";
import { withClientFilter } from "@/lib/query";
import { appointmentUpdateSchema } from "@/lib/validators/appointment";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: RouteContext) {
  try {
    await connectDB();
    const user = getUser(req);
    checkRole(user, ["CLIENT_ADMIN", "STAFF"]);
    checkModule(user, "appointments");

    const { id } = await ctx.params;
    const filter = withClientFilter(user);

    const body = await req.json();
    const parsed = appointmentUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const appt = await Appointment.findOne({ ...filter, _id: id });
    if (!appt) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 },
      );
    }

    if (parsed.data.status !== undefined) {
      appt.status = parsed.data.status;
      appt.completedAt =
        parsed.data.status === "completed" ? new Date() : undefined;
    }
    if (parsed.data.notes !== undefined) appt.notes = parsed.data.notes;
    if (parsed.data.date !== undefined) appt.date = new Date(parsed.data.date);

    await appt.save();

    return NextResponse.json({ appointment: appt });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
