import mongoose, { Schema, model, models } from "mongoose";

const FeedbackSchema = new Schema(
  {
    clientName: String,
    clientPhone: String,

    reviewText: String,
    remark: String,
    rating: { type: Number, min: 1, max: 5 },

    leadId: {
      type: mongoose.Types.ObjectId,
      ref: "Lead",
      index: true,
    },

    submittedAt: Date,

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
  { timestamps: true },
);

export default models.Feedback || model("Feedback", FeedbackSchema);
