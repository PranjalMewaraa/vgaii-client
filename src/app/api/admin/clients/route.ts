import { prisma } from "@/lib/prisma";
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
    const user = getUser(req);
    const block = requireSuperAdmin(user);
    if (block) return block;

    const body = await req.json();
    const parsed = createClientSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: parsed.data.admin.email },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 409 },
      );
    }

    // Single transaction: client + admin user are inseparable. If the user
    // create fails (e.g. weird db error), Prisma rolls the client back too,
    // replacing the manual `Client.deleteOne` rollback we had on Mongoose.
    const { client, admin } = await prisma.$transaction(async tx => {
      const c = await tx.client.create({
        data: {
          name: parsed.data.name,
          subscriptionStatus: parsed.data.subscriptionStatus ?? "trial",
          renewalDate: parsed.data.renewalDate
            ? new Date(parsed.data.renewalDate)
            : null,
          plan: parsed.data.plan ?? "basic",
          googlePlaceId: parsed.data.googlePlaceId?.trim() || null,
          bookingUrl: parsed.data.bookingUrl?.trim() || null,
          webhookKey: randomBytes(16).toString("hex"),
        },
      });

      const a = await tx.user.create({
        data: {
          name: parsed.data.admin.name,
          email: parsed.data.admin.email,
          password: await bcrypt.hash(parsed.data.admin.password, 10),
          role: "CLIENT_ADMIN",
          clientId: c.id,
          assignedModules: [],
          createdById: user.id,
        },
      });

      return { client: c, admin: a };
    });

    await logAudit(req, { actorType: "user", user, clientId: client.id }, {
      action: "client.created",
      entityType: "Client",
      entityId: client.id,
      entityLabel: client.name,
      summary: `Client created with admin ${admin.email}`,
      metadata: { plan: client.plan, subscriptionStatus: client.subscriptionStatus },
    });

    return NextResponse.json(
      {
        client: {
          id: client.id,
          name: client.name,
          subscriptionStatus: client.subscriptionStatus,
          plan: client.plan,
          webhookKey: client.webhookKey,
        },
        admin: {
          id: admin.id,
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
    const user = getUser(req);
    const block = requireSuperAdmin(user);
    if (block) return block;

    const clients = await prisma.client.findMany({
      select: {
        id: true,
        name: true,
        subscriptionStatus: true,
        plan: true,
        renewalDate: true,
        profileSlug: true,
        customDomain: true,
        googlePlaceId: true,
        bookingUrl: true,
        webhookKey: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const clientIds = clients.map(c => c.id);

    const [users, leadCounts, appointmentCounts, feedbackCounts] =
      await Promise.all([
        prisma.user.findMany({
          where: { clientId: { in: clientIds } },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            clientId: true,
            assignedModules: true,
            createdAt: true,
            createdById: true,
          },
          orderBy: { createdAt: "asc" },
        }),
        prisma.lead.groupBy({
          by: ["clientId"],
          where: { clientId: { in: clientIds } },
          _count: { _all: true },
        }),
        prisma.appointment.groupBy({
          by: ["clientId"],
          where: { clientId: { in: clientIds } },
          _count: { _all: true },
        }),
        prisma.feedback.groupBy({
          by: ["clientId"],
          where: { clientId: { in: clientIds }, status: "open" },
          _count: { _all: true },
        }),
      ]);

    const usersByClient = new Map<string, typeof users>();
    for (const u of users) {
      if (!u.clientId) continue;
      const list = usersByClient.get(u.clientId) ?? [];
      list.push(u);
      usersByClient.set(u.clientId, list);
    }

    // Prisma groupBy returns a list keyed by the `by` field; we look up by
    // clientId against `_count._all`.
    const prismaCountAt = (
      arr: Array<{ clientId: string | null; _count: { _all: number } }>,
      key: string,
    ) => arr.find(a => a.clientId === key)?._count._all ?? 0;

    const enriched = clients.map(c => {
      const usersForClient = usersByClient.get(c.id) ?? [];
      const admin = usersForClient.find(u => u.role === "CLIENT_ADMIN") ?? null;
      const staff = usersForClient.filter(u => u.role === "STAFF");
      // Re-shape to expose `createdBy` (vs Prisma's `createdById`) since
      // that's what the frontend reads. `assignedModules` is cast back to
      // string[] from the Json column.
      const remap = (u: typeof users[number]) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        clientId: u.clientId,
        assignedModules: (u.assignedModules as string[] | null) ?? [],
        createdAt: u.createdAt,
        createdBy: u.createdById,
      });
      return {
        id: c.id,
        name: c.name,
        subscriptionStatus: c.subscriptionStatus,
        plan: c.plan,
        renewalDate: c.renewalDate,
        profileSlug: c.profileSlug,
        customDomain: c.customDomain,
        googlePlaceId: c.googlePlaceId,
        bookingUrl: c.bookingUrl,
        webhookKey: c.webhookKey,
        createdAt: c.createdAt,
        admin: admin ? remap(admin) : null,
        staff: staff.map(remap),
        stats: {
          leads: prismaCountAt(leadCounts, c.id),
          appointments: prismaCountAt(appointmentCounts, c.id),
          openFeedback: prismaCountAt(feedbackCounts, c.id),
        },
      };
    });

    return NextResponse.json({ clients: enriched });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
