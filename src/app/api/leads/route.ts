import { connectDB } from "@/lib/db";
import Lead from "@/models/Lead";
import { getUser } from "@/middleware/auth";
import { checkRole, checkModule } from "@/lib/rbac";
import { withClientFilter } from "@/lib/query";
import { leadSchema } from "@/lib/validators/lead";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

// ➕ CREATE LEAD
export async function POST(req: Request) {
  try {
    await connectDB();

    const user = getUser(req);

    checkRole(user, ["CLIENT_ADMIN", "STAFF"]);
    checkModule(user, "leads");

    const body = await req.json();

    const parsed = leadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const lead = await Lead.create({
      ...parsed.data,
      clientId: user.clientId,
      createdBy: user.id,
    });

    return NextResponse.json({ lead });

  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

// 📥 GET LEADS
export async function GET(req: Request) {
  try {
    await connectDB();

    const user = getUser(req);

    checkRole(user, ["CLIENT_ADMIN", "STAFF"]);
    checkModule(user, "leads");

    const leads = await Lead.find(
      withClientFilter(user)
    )
      .sort({ createdAt: -1 })
      .limit(50);

    return NextResponse.json({ leads });

  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
