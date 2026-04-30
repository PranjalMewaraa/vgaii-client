import mongoose, { Schema, model, models } from "mongoose";

const AppointmentSchema = new Schema(
  {
    name: String,
    mobile: String,
    email: String,

    gender: String,
    age: Number,

    date: Date,

    clientId: {
      type: mongoose.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },

    source: {
      type: String,
      default: "calendly",
    },
  },
  { timestamps: true }
);

export default models.Appointment || model("Appointment", AppointmentSchema);