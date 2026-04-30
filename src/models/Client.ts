import { Schema, model, models } from "mongoose";

const ClientSchema = new Schema(
  {
    name: { type: String, required: true },

    subscriptionStatus: {
      type: String,
      enum: ["active", "expired", "trial"],
      default: "trial",
    },

    renewalDate: Date,
    googlePlaceId: String,
    reviewsTaskId: String,
    plan: {
      type: String,
      default: "basic",
    },
    calendlyWebhookKey: {
      type: String,
      unique: true,
      sparse: true, // allows null for others
    },
  },
  { timestamps: true },
);

export default models.Client || model("Client", ClientSchema);
