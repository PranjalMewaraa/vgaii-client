import mongoose, { Schema, model, models } from "mongoose";

const UserSchema = new Schema(
  {
    name: String,
    email: { type: String, unique: true },
    password: String,

    role: {
      type: String,
      enum: ["SUPER_ADMIN", "CLIENT_ADMIN", "STAFF"],
      default: "STAFF",
    },

    clientId: {
      type: mongoose.Types.ObjectId,
      ref: "Client",
      default: null,
    },

    assignedModules: {
      type: [String],
      default: [],
    },

    lastLoginIP: String,
  },
  { timestamps: true }
);

export default models.User || model("User", UserSchema);