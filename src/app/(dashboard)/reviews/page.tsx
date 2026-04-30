"use client";

import { useEffect, useState } from "react";
import ReviewCard from "@/components/ReviewCard";

type Review = {
  _id: string;
  rating?: number;
  reviewId: string;
  reviewText?: string;
  reviewerName?: string;
  sentiment?: "positive" | "negative";
};

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    fetch("/api/reviews", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then(res => res.json())
      .then(data => setReviews(data.reviews));
  }, []);

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Reviews</h1>

      {reviews.map((r) => (
        <ReviewCard key={r._id} review={r} />
      ))}
    </div>
  );
}
