import { connectDB } from "@/lib/db";
import Client from "@/models/Client";
import User from "@/models/User";
import Lead from "@/models/Lead";
import Appointment from "@/models/Appointment";
import Feedback from "@/models/Feedback";
import { getUser } from "@/middleware/auth";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    await connectDB();
    const user = getUser(req);

    if (user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
    const startOfWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalClients,
      activeClients,
      trialClients,
      expiredClients,
      totalUsers,
      adminUsers,
      staffUsers,
      totalLeads,
      todayLeads,
      weekLeads,
      visitedLeads,
      lostLeads,
      upcomingAppointments,
      completedAppointments,
      openFeedback,
      resolvedFeedback,
      profilesEnabled,
    ] = await Promise.all([
      Client.countDocuments({}),
      Client.countDocuments({ subscriptionStatus: "active" }),
      Client.countDocuments({ subscriptionStatus: "trial" }),
      Client.countDocuments({ subscriptionStatus: "expired" }),
      User.countDocuments({ role: { $in: ["CLIENT_ADMIN", "STAFF"] } }),
      User.countDocuments({ role: "CLIENT_ADMIN" }),
      User.countDocuments({ role: "STAFF" }),
      Lead.countDocuments({}),
      Lead.countDocuments({ createdAt: { $gte: startOfDay } }),
      Lead.countDocuments({ createdAt: { $gte: startOfWeek } }),
      Lead.countDocuments({ status: "visited" }),
      Lead.countDocuments({ status: "lost" }),
      Appointment.countDocuments({ date: { $gte: new Date() } }),
      Appointment.countDocuments({ status: "completed" }),
      Feedback.countDocuments({ status: "open" }),
      Feedback.countDocuments({ status: "resolved" }),
      Client.countDocuments({ "profile.enabled": true }),
    ]);

    return NextResponse.json({
      clients: {
        total: totalClients,
        active: activeClients,
        trial: trialClients,
        expired: expiredClients,
        profilesEnabled,
      },
      users: {
        total: totalUsers,
        admins: adminUsers,
        staff: staffUsers,
      },
      leads: {
        total: totalLeads,
        today: todayLeads,
        thisWeek: weekLeads,
        visited: visitedLeads,
        lost: lostLeads,
      },
      appointments: {
        upcoming: upcomingAppointments,
        completed: completedAppointments,
      },
      feedback: {
        open: openFeedback,
        resolved: resolvedFeedback,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
