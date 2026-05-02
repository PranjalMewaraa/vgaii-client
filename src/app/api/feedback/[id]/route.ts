import { connectDB } from "@/lib/db";
import Feedback from "@/models/Feedback";
import { getUser } from "@/middleware/auth";
import { getErrorMessage } from "@/lib/errors";
import { logAudit } from "@/lib/audit";
import { NextResponse } from "next/server";

type FeedbackRouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: Request, context: FeedbackRouteContext) {
  try {
    await connectDB();

    const user = getUser(req);
    const { id } = await context.params;

    const feedback = await Feedback.findOneAndUpdate(
      {
        _id: id,
        clientId: user.clientId,
      },
      { status: "resolved" },
      { new: true }
    );

    if (feedback) {
      await logAudit(req, { actorType: "user", user }, {
        action: "feedback.resolved",
        entityType: "Feedback",
        entityId: feedback._id.toString(),
        entityLabel: feedback.clientName ?? "Anonymous",
        summary: "Feedback marked resolved",
      });
    }

    return NextResponse.json({ feedback });

  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
