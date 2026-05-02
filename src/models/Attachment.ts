import mongoose, { Schema, model, models } from "mongoose";
import { ATTACHMENT_KINDS } from "@/lib/validators/attachment";

// Clinical record attachment (PDFs, scans, x-rays, …) stored in Cloudflare R2.
// Lifecycle:
//   1. Upload-url endpoint creates a row with `confirmed: false`.
//   2. Browser PUTs the file directly to R2 using a presigned URL.
//   3. Confirm endpoint HEADs the object; if present, flips `confirmed: true`.
//   4. List/download/delete endpoints only deal with confirmed rows.
const AttachmentSchema = new Schema(
  {
    appointmentId: {
      type: mongoose.Types.ObjectId,
      ref: "Appointment",
      required: true,
      index: true,
    },
    clientId: {
      type: mongoose.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },
    uploadedBy: {
      type: mongoose.Types.ObjectId,
      ref: "User",
    },
    kind: {
      type: String,
      enum: ATTACHMENT_KINDS,
      required: true,
    },
    filename: { type: String, required: true, maxlength: 200 },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true, min: 0 },
    storageKey: { type: String, required: true, unique: true },
    confirmed: { type: Boolean, default: false },
  },
  { timestamps: true },
);

AttachmentSchema.index({ appointmentId: 1, createdAt: -1 });
AttachmentSchema.index({ clientId: 1, confirmed: 1 });

export default models.Attachment || model("Attachment", AttachmentSchema);
