import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Client from "@/models/Client";
import bcrypt from "bcryptjs";
import { getUser } from "@/middleware/auth";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import type { AuthUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();
    const { name, email, password, role, clientName } = body;

    // Check existing user
    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 },
      );
    }

    let createdByUser: AuthUser | null = null;

    try {
      createdByUser = getUser(req); // may fail if first user
    } catch {
      createdByUser = null;
    }

    // 🔐 HASH PASSWORD
    const hashedPassword = await bcrypt.hash(password, 10);

    let newClientId = null;

    // 🧠 CASE 1: FIRST USER (NO AUTH) → SUPER ADMIN
    if (!createdByUser) {
      const user = await User.create({
        name,
        email,
        password: hashedPassword,
        role: "SUPER_ADMIN",
        clientId: null,
      });

      return NextResponse.json({ user });
    }

    // 🧠 CASE 2: SUPER ADMIN CREATES CLIENT ADMIN
    if (createdByUser.role === "SUPER_ADMIN" && role === "CLIENT_ADMIN") {
      if (!clientName) {
        return NextResponse.json(
          { error: "Client name required" },
          { status: 400 },
        );
      }

      const webhookKey = randomBytes(16).toString("hex");
      const client = await Client.create({
        name: clientName,
        subscriptionStatus: "trial",
        calendlyWebhookKey: webhookKey,
      });

      newClientId = client._id;
    }

    // 🧠 CASE 3: CLIENT ADMIN CREATES STAFF
    else if (createdByUser.role === "CLIENT_ADMIN" && role === "STAFF") {
      newClientId = createdByUser.clientId;
    } else {
      return NextResponse.json(
        { error: "Unauthorized role assignment" },
        { status: 403 },
      );
    }

    // 🚀 CREATE USER
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      clientId: newClientId,
      assignedModules: role === "STAFF" ? body.assignedModules || [] : [],
    });

    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
