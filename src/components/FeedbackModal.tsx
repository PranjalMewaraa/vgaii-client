"use client";

import { useState } from "react";

type FeedbackModalProps = {
  review: {
    reviewId: string;
    reviewText?: string;
  };
  onClose: () => void;
};

export default function FeedbackModal({ review, onClose }: FeedbackModalProps) {
  const [clientName, setClientName] = useState("");
  const [clientMobile, setClientMobile] = useState("");
  const [remark, setRemark] = useState("");

  const submit = async () => {
    await fetch("/api/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        clientName,
        clientMobile,
        reviewText: review.reviewText,
        reviewId: review.reviewId,
        remark,
      }),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="bg-white rounded-xl p-6 w-[400px] shadow-lg">

        <h2 className="text-lg font-semibold mb-3">
          Handle Negative Review
        </h2>

        <p className="text-sm mb-4 text-gray-600">
          {review.reviewText}
        </p>

        <input
          placeholder="Client Name"
          className="w-full mb-2 p-2 border rounded"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
        />

        <input
          placeholder="Client Mobile"
          className="w-full mb-2 p-2 border rounded"
          value={clientMobile}
          onChange={(e) => setClientMobile(e.target.value)}
        />

        <textarea
          placeholder="Remark"
          className="w-full mb-3 p-2 border rounded"
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
        />

        <div className="flex justify-end gap-2">
          <button onClick={onClose}>Cancel</button>
          <button
            onClick={submit}
            className="bg-purple-600 text-white px-4 py-1 rounded"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
