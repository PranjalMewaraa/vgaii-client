import { connectDB } from "@/lib/db";
import Client from "@/models/Client";
import User from "@/models/User";
import Lead from "@/models/Lead";
import Appointment from "@/models/Appointment";
import Feedback from "@/models/Feedback";
import { getUser } from "@/middleware/auth";
import { getErrorMessage } from "@/lib/errors";
import { createClientSchema } from "@/lib/validators/admin-client";
import { logAudit } from "@/lib/audit";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

const requireSuperAdmin = (user: ReturnType<typeof getUser>) => {
  if (user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
};

export async function POST(req: Request) {
  try {
    await connectDB();
    const user = getUser(req);
    const block = requireSuperAdmin(user);
    if (block) return block;

    const body = await req.json();
    const parsed = createClientSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const existingUser = await User.findOne({ email: parsed.data.admin.email });
    if (existingUser) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 409 },
      );
    }

    const client = await Client.create({
      name: parsed.data.name,
      subscriptionStatus: parsed.data.subscriptionStatus ?? "trial",
      renewalDate: parsed.data.renewalDate
        ? new Date(parsed.data.renewalDate)
        : undefined,
      plan: parsed.data.plan ?? "basic",
      googlePlaceId: parsed.data.googlePlaceId?.trim() || undefined,
      bookingUrl: parsed.data.bookingUrl?.trim() || undefined,
      webhookKey: randomBytes(16).toString("hex"),
    });

    let admin;
    try {
      admin = await User.create({
        name: parsed.data.admin.name,
        email: parsed.data.admin.email,
        password: await bcrypt.hash(parsed.data.admin.password, 10),
        role: "CLIENT_ADMIN",
        clientId: client._id,
        createdBy: user.id,
      });
    } catch (err) {
      // Roll back the client if the admin couldn't be created.
      await Client.deleteOne({ _id: client._id });
      throw err;
    }

    await logAudit(req, { actorType: "user", user, clientId: client._id.toString() }, {
      action: "client.created",
      entityType: "Client",
      entityId: client._id.toString(),
      entityLabel: client.name,
      summary: `Client created with admin ${admin.email}`,
      metadata: { plan: client.plan, subscriptionStatus: client.subscriptionStatus },
    });

    return NextResponse.json(
      {
        client: {
          _id: client._id,
          name: client.name,
          subscriptionStatus: client.subscriptionStatus,
          plan: client.plan,
          webhookKey: client.webhookKey,
        },
        admin: {
          _id: admin._id,
          name: admin.name,
          email: admin.email,
        },
      },
      { status: 201 },
    );
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    await connectDB();
    const user = getUser(req);
    const block = requireSuperAdmin(user);
    if (block) return block;

    const clients = await Client.find()
      .select(
        "_id name subscriptionStatus plan renewalDate profileSlug customDomain googlePlaceId bookingUrl webhookKey createdAt",
      )
      .sort({ createdAt: -1 })
      .lean();

    const clientIds = clients.map(c => c._id);

    const [users, leadCounts, appointmentCounts, feedbackCounts] =
      await Promise.all([
        User.find({ clientId: { $in: clientIds } })
          .select(
            "_id name email role clientId assignedModules createdAt createdBy",
          )
          .sort({ createdAt: 1 })
          .lean(),
        Lead.aggregate([
          { $match: { clientId: { $in: clientIds } } },
          { $group: { _id: "$clientId", count: { $sum: 1 } } },
        ]),
        Appointment.aggregate([
          { $match: { clientId: { $in: clientIds } } },
          { $group: { _id: "$clientId", count: { $sum: 1 } } },
        ]),
        Feedback.aggregate([
          {
            $match: {
              clientId: { $in: clientIds },
              status: "open",
            },
          },
          { $group: { _id: "$clientId", count: { $sum: 1 } } },
        ]),
      ]);

    const usersByClient = new Map<string, typeof users>();
    for (const u of users) {
      const key = u.clientId?.toString();
      if (!key) continue;
      const list = usersByClient.get(key) ?? [];
      list.push(u);
      usersByClient.set(key, list);
    }

    const countAt = (
      arr: { _id: { toString(): string }; count: number }[],
      key: string,
    ) => arr.find(a => a._id?.toString() === key)?.count ?? 0;

    const enriched = clients.map(c => {
      const key = c._id.toString();
      const usersForClient = usersByClient.get(key) ?? [];
      const admin = usersForClient.find(u => u.role === "CLIENT_ADMIN") ?? null;
      const staff = usersForClient.filter(u => u.role === "STAFF");
      return {
        ...c,
        admin,
        staff,
        stats: {
          leads: countAt(leadCounts, key),
          appointments: countAt(appointmentCounts, key),
          openFeedback: countAt(feedbackCounts, key),
        },
      };
    });

    return NextResponse.json({ clients: enriched });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
