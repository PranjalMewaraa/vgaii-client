import { connectDB } from "@/lib/db";
import Feedback from "@/models/Feedback";
import Lead from "@/models/Lead";
import { getUser } from "@/middleware/auth";
import { checkRole, checkModule } from "@/lib/rbac";
import { withClientFilter } from "@/lib/query";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    await connectDB();

    const user = getUser(req);
    checkRole(user, ["CLIENT_ADMIN", "STAFF"]);
    checkModule(user, "feedback");

    const filter = withClientFilter(user);

    const feedbacks = await Feedback.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    const leadIds = feedbacks
      .map(f => f.leadId)
      .filter((id): id is NonNullable<typeof id> => !!id);

    const leads = leadIds.length
      ? await Lead.find({ _id: { $in: leadIds } })
          .select("_id name phone status")
          .lean()
      : [];

    const leadById = new Map(leads.map(l => [l._id.toString(), l]));

    const enriched = feedbacks.map(f => ({
      ...f,
      lead: f.leadId ? leadById.get(f.leadId.toString()) ?? null : null,
    }));

    return NextResponse.json({ feedbacks: enriched });

  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
