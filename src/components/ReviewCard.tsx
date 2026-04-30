"use client";

import { useState } from "react";
import FeedbackModal from "@/components/FeedbackModal";

type ReviewCardProps = {
  review: {
    _id: string;
    rating?: number;
    reviewId: string;
    reviewText?: string;
    reviewerName?: string;
    sentiment?: "positive" | "negative";
  };
};

export default function ReviewCard({ review }: ReviewCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="p-4 rounded-xl shadow bg-white/70 backdrop-blur-md mb-4">
      <p className="font-semibold">{review.reviewerName}</p>
      <p className="text-sm text-gray-600">{review.reviewText}</p>

      <div className="flex justify-between items-center mt-2">
        <span className="text-sm">
          {review.rating} ⭐
        </span>

        {/* ✅ CONDITIONAL BUTTON */}
        {review.sentiment === "negative" && (
          <button
            onClick={() => setOpen(true)}
            className="px-3 py-1 text-sm rounded-lg bg-red-500 text-white hover:scale-105 transition"
          >
            Take Action
          </button>
        )}
      </div>

      {/* Modal */}
      {open && (
        <FeedbackModal
          review={review}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
