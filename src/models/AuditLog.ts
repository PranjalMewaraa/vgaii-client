import mongoose, { Schema, model, models } from "mongoose";

// Single append-only log of every meaningful mutation in the system.
// Snapshotting actorLabel + entityLabel keeps history readable even after
// the referenced user/lead/etc is deleted.
const AuditLogSchema = new Schema(
  {
    clientId: {
      type: mongoose.Types.ObjectId,
      ref: "Client",
      index: true,
      default: null,
    },
    actorType: {
      type: String,
      enum: ["user", "webhook", "public", "system"],
      required: true,
    },
    actorId: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      default: null,
    },
    actorLabel: { type: String, default: "" },
    ip: { type: String, default: null },
    action: { type: String, required: true, index: true },
    entityType: { type: String, required: true, index: true },
    entityId: { type: mongoose.Types.ObjectId, default: null },
    entityLabel: { type: String, default: "" },
    summary: { type: String, default: "" },
    metadata: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

AuditLogSchema.index({ clientId: 1, createdAt: -1 });
AuditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

export default models.AuditLog || model("AuditLog", AuditLogSchema);
