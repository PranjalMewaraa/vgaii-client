import { connectDB } from "@/lib/db";
import Client from "@/models/Client";
import { getUser } from "@/middleware/auth";
import { NextResponse } from "next/server";

// CREATE CLIENT
export async function POST(req: Request) {
  try {
    await connectDB();

    const user = getUser(req);

    if (user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    const client = await Client.create({
      name: body.name,
      subscriptionStatus: body.subscriptionStatus || "trial",
      renewalDate: body.renewalDate,
      googlePlaceId: body.googlePlaceId,
      plan: body.plan || "basic",
    });

    return NextResponse.json({ client });
  } catch {
    return NextResponse.json({ error: "Error creating client" }, { status: 500 });
  }
}

// GET ALL CLIENTS
export async function GET(req: Request) {
  try {
    await connectDB();

    const user = getUser(req);

    if (user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const clients = await Client.find().sort({ createdAt: -1 });

    return NextResponse.json({ clients });
  } catch {
    return NextResponse.json({ error: "Error fetching clients" }, { status: 500 });
  }
}
