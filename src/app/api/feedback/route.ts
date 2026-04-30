import { connectDB } from "@/lib/db";
import Feedback from "@/models/Feedback";
import { getUser } from "@/middleware/auth";
import { checkRole, checkModule } from "@/lib/rbac";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    await connectDB();

    const user = getUser(req);

    checkRole(user, ["CLIENT_ADMIN", "STAFF"]);
    checkModule(user, "feedback");

    const body = await req.json();

    const feedback = await Feedback.create({
      clientName: body.clientName,
      clientMobile: body.clientMobile,
      reviewText: body.reviewText,
      remark: body.remark,
      reviewId: body.reviewId,
      clientId: user.clientId,
    });

    return NextResponse.json({ feedback });

  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
export async function GET(req: Request) {
  try {
    await connectDB();

    const user = getUser(req);

    checkRole(user, ["CLIENT_ADMIN", "STAFF"]);
    checkModule(user, "feedback");

    const feedbacks = await Feedback.find({
      clientId: user.clientId,
    }).sort({ createdAt: -1 });

    return NextResponse.json({ feedbacks });

  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
