import mongoose, { Schema, model, models } from "mongoose";
import { APPOINTMENT_STATUSES } from "@/lib/constants";

export { APPOINTMENT_STATUSES };
export type { AppointmentStatus } from "@/lib/constants";

const AppointmentSchema = new Schema(
  {
    name: String,
    phone: { type: String, index: true },
    email: String,

    gender: String,
    age: Number,

    date: Date,

    status: {
      type: String,
      enum: APPOINTMENT_STATUSES,
      default: "scheduled",
      index: true,
    },
    completedAt: Date,
    notes: { type: String, default: "" },

    clientId: {
      type: mongoose.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },

    leadId: {
      type: mongoose.Types.ObjectId,
      ref: "Lead",
      index: true,
    },

    source: {
      type: String,
      default: "calendly",
    },
  },
  { timestamps: true },
);

export default models.Appointment || model("Appointment", AppointmentSchema);
