import mongoose, { Schema, model, models } from "mongoose";
import { LEAD_STATUSES } from "@/lib/constants";

export { LEAD_STATUSES };
export type { LeadStatus } from "@/lib/constants";

const LeadSchema = new Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true, index: true },
    area: { type: String },
    source: { type: String },

    status: {
      type: String,
      enum: LEAD_STATUSES,
      default: "new",
      index: true,
    },
    statusUpdatedAt: { type: Date, default: Date.now },

    outcomeRating: { type: Number, min: 1, max: 5 },

    feedbackToken: {
      type: String,
      unique: true,
      sparse: true,
    },
    feedbackTokenUsed: { type: Boolean, default: false },

    notes: { type: String, default: "" },

    clientId: {
      type: mongoose.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },

    createdBy: {
      type: mongoose.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

LeadSchema.index({ clientId: 1, phone: 1 });

export default models.Lead || model("Lead", LeadSchema);
