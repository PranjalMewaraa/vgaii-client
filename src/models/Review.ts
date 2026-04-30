import mongoose, { Schema, model, models } from "mongoose";

const ReviewSchema = new Schema(
  {
    rating: Number,
    reviewText: String,
    reviewerName: String,

    sentiment: {
      type: String,
      enum: ["positive", "negative"],
    },

    reviewId: {
      type: String,
      unique: true,
    },

    clientId: {
      type: mongoose.Types.ObjectId,
      ref: "Client",
      index: true,
    },

    createdAtSource: Date,
  },
  { timestamps: true }
);

export default models.Review || model("Review", ReviewSchema);