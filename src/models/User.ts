import mongoose, { Schema, model, models } from "mongoose";
import { ASSIGNABLE_MODULES } from "@/lib/rbac";

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
      type: [
        {
          type: String,
          enum: ASSIGNABLE_MODULES,
        },
      ],
      default: [],
    },

    createdBy: {
      type: mongoose.Types.ObjectId,
      ref: "User",
    },

    lastLoginIP: String,
    lastLoginAt: Date,
  },
  { timestamps: true },
);

export default models.User || model("User", UserSchema);
