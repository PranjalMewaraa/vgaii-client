import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getUser } from "@/middleware/auth";
import { staffCreateSchema } from "@/lib/validators/staff";
import { getErrorMessage } from "@/lib/errors";
import { logAudit } from "@/lib/audit";
import { NextResponse } from "next/server";

const requireAdmin = (user: ReturnType<typeof getUser>) => {
  if (user.role !== "CLIENT_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!user.clientId) {
    return NextResponse.json({ error: "No client context" }, { status: 400 });
  }
  return null;
};

export async function GET(req: Request) {
  try {
    const user = getUser(req);
    const block = requireAdmin(user);
    if (block) return block;

    const staff = await prisma.user.findMany({
      where: { clientId: user.clientId, role: "STAFF" },
      select: {
        id: true,
        name: true,
        email: true,
        assignedModules: true,
        createdAt: true,
        createdById: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      staff: staff.map(s => ({
        id: s.id,
        name: s.name,
        email: s.email,
        assignedModules: (s.assignedModules as string[] | null) ?? [],
        createdAt: s.createdAt,
        createdBy: s.createdById,
      })),
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = getUser(req);
    const block = requireAdmin(user);
    if (block) return block;

    const body = await req.json();
    const parsed = staffCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 409 },
      );
    }

    const hashed = await bcrypt.hash(parsed.data.password, 10);

    const staff = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        password: hashed,
        role: "STAFF",
        clientId: user.clientId,
        assignedModules: parsed.data.assignedModules,
        createdById: user.id,
      },
    });

    await logAudit(req, { actorType: "user", user }, {
      action: "staff.created",
      entityType: "User",
      entityId: staff.id,
      entityLabel: staff.name ?? staff.email ?? "Staff",
      summary: `Staff added (${(parsed.data.assignedModules ?? []).join(", ") || "no modules"})`,
      metadata: { email: staff.email, assignedModules: parsed.data.assignedModules },
    });

    return NextResponse.json(
      {
        staff: {
          id: staff.id,
          name: staff.name,
          email: staff.email,
          assignedModules: (staff.assignedModules as string[] | null) ?? [],
          createdAt: staff.createdAt,
          createdBy: staff.createdById,
        },
      },
      { status: 201 },
    );
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
