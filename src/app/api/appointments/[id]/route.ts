import { connectDB } from "@/lib/db";
import Appointment from "@/models/Appointment";
import Lead from "@/models/Lead";
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

    const wasCompleted = appt.status === "completed";
    if (parsed.data.status !== undefined) {
      appt.status = parsed.data.status;
      appt.completedAt =
        parsed.data.status === "completed" ? new Date() : undefined;
    }
    if (parsed.data.notes !== undefined) appt.notes = parsed.data.notes;
    if (parsed.data.date !== undefined) appt.date = new Date(parsed.data.date);
    if (parsed.data.diagnosis !== undefined) {
      appt.diagnosis = parsed.data.diagnosis;
    }
    if (parsed.data.medicines !== undefined) {
      appt.medicines = parsed.data.medicines;
    }
    if (parsed.data.name !== undefined) appt.name = parsed.data.name;
    if (parsed.data.phone !== undefined) appt.phone = parsed.data.phone;
    if (parsed.data.email !== undefined) appt.email = parsed.data.email;
    if (parsed.data.age !== undefined) appt.age = parsed.data.age;
    if (parsed.data.gender !== undefined) appt.gender = parsed.data.gender;

    await appt.save();

    // First time this appointment is being marked completed — promote the
    // linked lead from "appointment_booked" to "visited" if applicable.
    // Subsequent completions on later appointments don't change the lead
    // status (it's already terminal at "visited" or "lost").
    if (
      !wasCompleted &&
      parsed.data.status === "completed" &&
      appt.leadId
    ) {
      await Lead.updateOne(
        { _id: appt.leadId, status: "appointment_booked" },
        { status: "visited", statusUpdatedAt: new Date() },
      );
    }

    return NextResponse.json({ appointment: appt });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function DELETE(req: Request, ctx: RouteContext) {
  try {
    await connectDB();
    const user = getUser(req);
    checkRole(user, ["CLIENT_ADMIN", "STAFF"]);
    checkModule(user, "appointments");

    const { id } = await ctx.params;
    const filter = withClientFilter(user);

    const result = await Appointment.deleteOne({ ...filter, _id: id });
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
