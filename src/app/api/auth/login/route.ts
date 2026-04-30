import { connectDB } from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { generateToken } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();

    const { email, password } = body;

    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json({ error: "Invalid creds" }, { status: 400 });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json({ error: "Invalid creds" }, { status: 400 });
    }

    const token = generateToken({
      id: user._id.toString(),
      role: user.role,
      clientId: user.clientId?.toString() ?? null,
      assignedModules: user.assignedModules ?? [],
    });

    return NextResponse.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        clientId: user.clientId,
        assignedModules: user.assignedModules ?? [],
      },
    });
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
