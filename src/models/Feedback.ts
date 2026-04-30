import mongoose, { Schema, model, models } from "mongoose";

const FeedbackSchema = new Schema(
  {
    clientName: String,
    clientMobile: String,

    reviewText: String,
    remark: String,

    reviewId: {
      type: String, // link with Google review
    },

    status: {
      type: String,
      enum: ["open", "resolved"],
      default: "open",
    },

    clientId: {
      type: mongoose.Types.ObjectId,
      ref: "Client",
      index: true,
    },
  },
  { timestamps: true }
);

export default models.Feedback || model("Feedback", FeedbackSchema);