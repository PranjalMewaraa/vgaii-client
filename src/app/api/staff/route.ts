import { connectDB } from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { getUser } from "@/middleware/auth";
import { staffCreateSchema } from "@/lib/validators/staff";
import { getErrorMessage } from "@/lib/errors";
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
    await connectDB();
    const user = getUser(req);
    const block = requireAdmin(user);
    if (block) return block;

    const staff = await User.find({
      clientId: user.clientId,
      role: "STAFF",
    })
      .select("_id name email assignedModules createdAt createdBy")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ staff });

  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const user = getUser(req);
    const block = requireAdmin(user);
    if (block) return block;

    const body = await req.json();
    const parsed = staffCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const existing = await User.findOne({ email: parsed.data.email });
    if (existing) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 409 },
      );
    }

    const hashed = await bcrypt.hash(parsed.data.password, 10);

    const staff = await User.create({
      name: parsed.data.name,
      email: parsed.data.email,
      password: hashed,
      role: "STAFF",
      clientId: user.clientId,
      assignedModules: parsed.data.assignedModules,
      createdBy: user.id,
    });

    return NextResponse.json(
      {
        staff: {
          _id: staff._id,
          name: staff.name,
          email: staff.email,
          assignedModules: staff.assignedModules,
          createdAt: staff.createdAt,
          createdBy: staff.createdBy,
        },
      },
      { status: 201 },
    );

  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
