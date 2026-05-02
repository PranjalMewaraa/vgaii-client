import mongoose, { Schema, model, models } from "mongoose";
import { LEAD_STATUSES } from "@/lib/constants";
import { canonicalPhone } from "@/lib/phone";

export { LEAD_STATUSES };
export type { LeadStatus } from "@/lib/constants";

const LeadSchema = new Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true, index: true },
    // Last 10 digits of `phone`, computed automatically by the pre-save hook
    // below. Used for cross-source matching (Cal.com webhook, status webhook,
    // CSV import) so different formats — `9717583895` vs `+919717583895` vs
    // `+91 9717 583895` — all match the same lead.
    phoneNormalized: { type: String, index: true },
    email: { type: String },
    age: { type: Number, min: 0, max: 150 },
    gender: { type: String },
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
LeadSchema.index({ clientId: 1, phoneNormalized: 1 });

// Keep phoneNormalized in sync whenever a document is saved. Covers both
// new docs (`Lead.create(...)`) and existing-doc mutations (`doc.save()`).
LeadSchema.pre("save", function () {
  const doc = this as unknown as { phone?: string; phoneNormalized?: string };
  if (doc.phone !== undefined) {
    doc.phoneNormalized = canonicalPhone(doc.phone);
  }
});

export default models.Lead || model("Lead", LeadSchema);
