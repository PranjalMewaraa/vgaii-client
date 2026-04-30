import { connectDB } from "@/lib/db";
import Client from "@/models/Client";
import Review from "@/models/Review";
import { getReviewTask } from "@/lib/dataforseo";
import { getSentiment } from "@/lib/sentiment";
import { getErrorMessage } from "@/lib/errors";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    await connectDB();

    const clients = await Client.find({
      reviewsTaskId: { $exists: true },
    });

    for (const client of clients) {
      const result = await getReviewTask(client.reviewsTaskId);

      const reviews = result.items || [];

      for (const r of reviews) {
        await Review.updateOne(
          { reviewId: r.review_id },
          {
            rating: r.rating?.value,
            reviewText: r.review_text,
            reviewerName: r.profile_name,
            sentiment: getSentiment(r.rating?.value || 5),
            clientId: client._id,
            createdAtSource: r.timestamp,
          },
          { upsert: true }
        );
      }
    }

    return NextResponse.json({ message: "Reviews synced" });

  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
