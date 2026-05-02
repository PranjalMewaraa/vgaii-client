import { connectDB } from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { generateToken } from "@/lib/auth";
import { rateLimit, clearRateLimit, getClientIp } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";
import { NextResponse } from "next/server";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

export async function POST(req: Request) {
  try {
    await connectDB();
    const ip = getClientIp(req);

    // Per-IP brute-force shield. Locks out at the 6th wrong guess inside
    // any rolling 15-minute window. Successful logins reset the counter.
    const rl = rateLimit(`login:${ip}`, MAX_ATTEMPTS, WINDOW_MS);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many login attempts. Try again later." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
      );
    }

    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Invalid creds" }, { status: 400 });
    }

    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      // Audit failed attempts so admins can spot brute-force patterns.
      await logAudit(
        req,
        { actorType: "system", source: "login" },
        {
          action: "auth.login.failed",
          entityType: "User",
          entityLabel: typeof email === "string" ? email : "(unknown)",
          summary: "Failed login attempt",
          metadata: { email, remainingAttempts: rl.remaining },
        },
      );
      return NextResponse.json({ error: "Invalid creds" }, { status: 400 });
    }

    user.lastLoginAt = new Date();
    user.lastLoginIP = ip;
    await user.save();

    clearRateLimit(`login:${ip}`);

    const token = generateToken({
      id: user._id.toString(),
      role: user.role,
      clientId: user.clientId?.toString() ?? null,
      assignedModules: user.assignedModules ?? [],
    });

    await logAudit(
      req,
      {
        actorType: "user",
        user: {
          id: user._id.toString(),
          role: user.role,
          clientId: user.clientId?.toString() ?? null,
        },
      },
      {
        action: "auth.login.success",
        entityType: "User",
        entityId: user._id.toString(),
        entityLabel: user.name ?? user.email,
        summary: "Logged in",
      },
    );

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
