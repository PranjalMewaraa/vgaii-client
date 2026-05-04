import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { generateToken } from "@/lib/auth";
import { rateLimit, clearRateLimit, getClientIp } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";
import { NextResponse } from "next/server";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

export async function POST(req: Request) {
  try {
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

    const user = await prisma.user.findUnique({ where: { email } });
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

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIP: ip },
    });

    clearRateLimit(`login:${ip}`);

    // assignedModules is a Json column in Prisma; cast back to string[] for
    // the JWT payload and the response. App writes always store an array.
    const modules = (user.assignedModules as string[] | null) ?? [];

    const token = generateToken({
      id: user.id,
      role: user.role,
      clientId: user.clientId ?? null,
      assignedModules: modules,
    });

    await logAudit(
      req,
      {
        actorType: "user",
        user: {
          id: user.id,
          role: user.role,
          clientId: user.clientId ?? null,
        },
      },
      {
        action: "auth.login.success",
        entityType: "User",
        entityId: user.id,
        entityLabel: user.name ?? user.email,
        summary: "Logged in",
      },
    );

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        clientId: user.clientId,
        assignedModules: modules,
      },
    });
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
